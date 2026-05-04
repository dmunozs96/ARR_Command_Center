"""
SnapshotManager: persists a full ARR calculation run to the database.

Flow:
  1. Create Snapshot record
  2. Bulk-insert RawOpportunityLineItem records
  3. Run ARRCalculator
  4. Bulk-insert ARRLineItem records
  5. Build monthly summary and insert ARRMonthlySummary records
  6. Insert SnapshotAlert records
  7. Update Snapshot with counts and status
"""

import hashlib
import json
import time
import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from app.backend.core.arr_calculator import ARRCalculator, ARRSnapshot, RawLineItem
from app.backend.db.models import (
    ARRLineItem,
    ARRMonthlySummary,
    RawOpportunityLineItem,
    Snapshot,
    SnapshotAlert,
)


def _first_day(d: date) -> date:
    return d.replace(day=1)


def _month_range(start: date, end: date) -> List[date]:
    """Return list of first-day-of-month dates from start to end inclusive."""
    months = []
    current = _first_day(start)
    end_first = _first_day(end)
    while current <= end_first:
        months.append(current)
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months


def compute_raw_hash(raw_items: List) -> str:
    """SHA-256 of sorted raw line items. Used to detect unchanged SF syncs."""
    records = sorted(
        [
            {
                "id": item.sf_line_item_id,
                "opp": item.sf_opportunity_id,
                "start": str(item.subscription_start_date),
                "end": str(item.subscription_end_date),
                "price": str(item.unit_price),
                "qty": str(item.quantity),
                "product": item.product_name,
                "close": str(item.close_date),
            }
            for item in raw_items
        ],
        key=lambda r: r["id"],
    )
    return hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest()


class SnapshotManager:
    def __init__(self, db: Session):
        self.db = db

    def latest_data_hash(self) -> Optional[str]:
        """Return the data_hash of the most recent completed SF snapshot, or None."""
        latest = (
            self.db.query(Snapshot)
            .filter(
                Snapshot.status == "completed",
                Snapshot.sync_type == "salesforce_full",
                Snapshot.data_hash.isnot(None),
            )
            .order_by(Snapshot.created_at.desc())
            .first()
        )
        return latest.data_hash if latest else None

    def create_snapshot(
        self,
        raw_items: List[RawLineItem],
        sync_type: str = "manual",
        triggered_by: Optional[str] = None,
        notes: Optional[str] = None,
        data_hash: Optional[str] = None,
    ) -> Snapshot:
        t0 = time.time()

        snapshot = Snapshot(
            id=uuid.uuid4(),
            sync_type=sync_type,
            triggered_by=triggered_by,
            status="processing",
            notes=notes,
            sf_records_fetched=len(raw_items),
            data_hash=data_hash,
        )
        self.db.add(snapshot)
        self.db.flush()

        # Map sf_line_item_id → DB UUID for linking ARRLineItem later
        id_map: dict[str, uuid.UUID] = {}

        raw_db_rows = []
        for item in raw_items:
            row_id = uuid.uuid4()
            id_map[item.sf_line_item_id] = row_id
            raw_db_rows.append(
                RawOpportunityLineItem(
                    id=row_id,
                    snapshot_id=snapshot.id,
                    sf_opportunity_id=item.sf_opportunity_id,
                    sf_line_item_id=item.sf_line_item_id,
                    opportunity_name=item.opportunity_name,
                    account_name=item.account_name,
                    opportunity_owner=item.opportunity_owner,
                    opportunity_type=item.opportunity_type,
                    channel_type=item.channel_type,
                    opportunity_amount=item.opportunity_amount,
                    close_date=item.close_date,
                    product_name=item.product_name,
                    product_code=item.product_code,
                    unit_price=item.unit_price,
                    quantity=item.quantity,
                    subscription_start_date=item.subscription_start_date,
                    subscription_end_date=item.subscription_end_date,
                    licence_period_months=item.licence_period_months,
                    business_line=item.business_line,
                )
            )
        self.db.bulk_save_objects(raw_db_rows)
        self.db.flush()

        # Load lookup tables from DB
        from app.backend.db.models import ProductClassification, ConsultantCountry
        product_map = {
            r.product_name: r.product_type
            for r in self.db.query(ProductClassification).all()
        }
        consultant_map = {
            r.consultant_name: r.country
            for r in self.db.query(ConsultantCountry).all()
        }

        calculator = ARRCalculator(product_map, consultant_map)
        arr_snapshot: ARRSnapshot = calculator.process_all(raw_items)

        # Persist ARRLineItem rows
        arr_rows = []
        for result in arr_snapshot.line_items:
            raw_db_id = id_map.get(result.raw.sf_line_item_id)
            arr_rows.append(
                ARRLineItem(
                    id=uuid.uuid4(),
                    snapshot_id=snapshot.id,
                    raw_line_item_id=raw_db_id,
                    product_type=result.product_type,
                    is_saas=result.is_saas,
                    effective_start_date=result.effective_start_date,
                    effective_end_date=result.effective_end_date,
                    used_start_fallback=result.used_start_fallback,
                    used_end_fallback=result.used_end_fallback,
                    start_month=result.start_month,
                    end_month_normalized=result.end_month_normalized,
                    service_days=result.service_days,
                    real_price=result.real_price,
                    daily_price=result.daily_price,
                    annualized_value=result.annualized_value,
                    consultant_country=result.consultant_country,
                    data_quality_flags=result.data_quality_flags,
                )
            )
        self.db.bulk_save_objects(arr_rows)
        self.db.flush()

        # Build monthly summary
        saas_items = arr_snapshot.saas_items()
        if saas_items:
            min_month = min(i.start_month for i in saas_items)
            max_month = max(i.end_month_normalized for i in saas_items)
            months = _month_range(min_month, max_month)
            monthly = calculator.build_monthly_summary(arr_snapshot, months)

            summary_rows = []
            for month, by_type in monthly.items():
                for product_type, arr_value in by_type.items():
                    count = sum(
                        1 for i in saas_items
                        if i.product_type == product_type
                        and i.start_month <= month
                        and i.end_month_normalized >= month
                    )
                    summary_rows.append(
                        ARRMonthlySummary(
                            snapshot_id=snapshot.id,
                            month=month,
                            product_type=product_type,
                            arr_value=arr_value,
                            line_items_count=count,
                        )
                    )
            self.db.bulk_save_objects(summary_rows)
            self.db.flush()

        # Persist alerts
        alert_rows = []
        for a in arr_snapshot.alerts:
            alert_rows.append(
                SnapshotAlert(
                    id=uuid.uuid4(),
                    snapshot_id=snapshot.id,
                    alert_type=a["alert_type"],
                    severity=a["severity"],
                    sf_opportunity_id=a.get("sf_opportunity_id"),
                    opportunity_name=a.get("opportunity_name"),
                    account_name=a.get("account_name"),
                    product_name=a.get("product_name"),
                    description=a["description"],
                )
            )
        self.db.bulk_save_objects(alert_rows)

        # Finalize snapshot
        unclassified = sum(
            1 for a in arr_snapshot.alerts if a["alert_type"] == "UNCLASSIFIED_PRODUCT"
        )
        snapshot.status = "completed"
        snapshot.sf_records_processed = len(arr_snapshot.line_items)
        snapshot.unclassified_products_count = unclassified
        snapshot.alerts_count = len(arr_snapshot.alerts)
        snapshot.duration_seconds = round(time.time() - t0, 2)

        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

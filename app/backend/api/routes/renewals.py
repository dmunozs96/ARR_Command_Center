"""Forward-looking renewal monitor for active Salesforce ARR contracts."""

import calendar
from datetime import date
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.backend.api.schemas import (
    RenewalItem,
    RenewalMonitorResponse,
    RenewalMonthPoint,
    RenewalSummary,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot

router = APIRouter()

StatusFilter = Literal["all", "at_risk", "renewed"]
ZERO = Decimal("0")


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _days_in_month(value: date) -> int:
    return calendar.monthrange(value.year, value.month)[1]


def _add_months(value: date, months: int) -> date:
    offset = value.year * 12 + value.month - 1 + months
    year, month = divmod(offset, 12)
    day = min(value.day, calendar.monthrange(year, month + 1)[1])
    return date(year, month + 1, day)


def _months_remaining(today: date, expiry: date) -> int:
    months = (expiry.year - today.year) * 12 + expiry.month - today.month
    if expiry.day < today.day:
        months -= 1
    return max(months, 0)


def _snapshot_or_404(db: Session, snapshot_id: Optional[UUID]) -> Snapshot:
    query = db.query(Snapshot).filter(Snapshot.status == "completed")
    query = query.filter(Snapshot.id == snapshot_id) if snapshot_id else query.order_by(Snapshot.created_at.desc())
    snapshot = query.first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No hay snapshots disponibles")
    return snapshot


@router.get("/monitor", response_model=RenewalMonitorResponse)
def get_renewal_monitor(
    snapshot_id: Optional[UUID] = Query(None),
    horizon_months: int = Query(6, ge=1, le=24),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    status: StatusFilter = Query("all"),
    db: Session = Depends(get_db),
):
    snapshot = _snapshot_or_404(db, snapshot_id)
    today = date.today()
    current_month = _month_start(today)
    horizon_end = _add_months(today, horizon_months)

    query = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snapshot.id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
    )
    if product_type:
        query = query.filter(ARRLineItem.product_type == product_type)
    if product_types:
        values = [value.strip() for value in product_types.split(",") if value.strip()]
        if values:
            query = query.filter(ARRLineItem.product_type.in_(values))
    if account_name:
        query = query.filter(RawOpportunityLineItem.account_name == account_name)

    grouped: dict[tuple[str, str], list[tuple[ARRLineItem, RawOpportunityLineItem]]] = {}
    for arr_item, raw_item in query.all():
        if not raw_item.account_name or not arr_item.product_type:
            continue
        grouped.setdefault((raw_item.account_name, arr_item.product_type), []).append((arr_item, raw_item))

    all_items: list[RenewalItem] = []
    for (account, item_type), rows in grouped.items():
        active = [
            (arr_item, raw_item)
            for arr_item, raw_item in rows
            if arr_item.start_month <= current_month <= arr_item.end_month_normalized
        ]
        if not active:
            continue
        expiry = max(arr_item.end_month_normalized for arr_item, _ in active)
        if not (today <= expiry <= horizon_end):
            continue

        renewal_rows = [(arr_item, raw_item) for arr_item, raw_item in rows if arr_item.start_month > expiry]
        first_renewal_month = min((arr_item.start_month for arr_item, _ in renewal_rows), default=None)
        signed_renewals = [
            (arr_item, raw_item)
            for arr_item, raw_item in renewal_rows
            if arr_item.start_month == first_renewal_month
        ]

        current_arr = sum(
            (Decimal(str(arr_item.daily_price)) * _days_in_month(current_month) for arr_item, _ in active),
            ZERO,
        )
        renewal_arr = (
            sum(
                (
                    Decimal(str(arr_item.daily_price)) * _days_in_month(first_renewal_month)
                    for arr_item, _ in signed_renewals
                ),
                ZERO,
            )
            if first_renewal_month
            else None
        )
        latest_current = max(active, key=lambda pair: pair[0].end_month_normalized)
        is_renewed = renewal_arr is not None
        all_items.append(
            RenewalItem(
                account_name=account,
                product_type=item_type,
                consultant=latest_current[1].opportunity_owner,
                current_arr=current_arr,
                expiry_month=expiry,
                months_remaining=_months_remaining(today, expiry),
                is_renewed=is_renewed,
                renewal_arr=renewal_arr,
                renewal_delta_pct=(
                    float((renewal_arr - current_arr) / current_arr * 100)
                    if renewal_arr is not None and current_arr
                    else None
                ),
                status="renewed" if is_renewed else "at_risk",
            )
        )

    all_items.sort(key=lambda item: (item.status == "renewed", item.expiry_month, item.account_name))
    visible_items = [item for item in all_items if status == "all" or item.status == status]

    by_month_data: dict[date, dict[str, Decimal | int]] = {}
    for item in all_items:
        month = item.expiry_month.replace(day=1)
        point = by_month_data.setdefault(
            month,
            {"at_risk_arr": ZERO, "renewed_arr": ZERO, "at_risk_count": 0, "renewed_count": 0},
        )
        if item.status == "at_risk":
            point["at_risk_arr"] += item.current_arr
            point["at_risk_count"] += 1
        else:
            point["renewed_arr"] += item.renewal_arr or ZERO
            point["renewed_count"] += 1

    return RenewalMonitorResponse(
        items=visible_items,
        summary=RenewalSummary(
            at_risk_arr=sum((item.current_arr for item in all_items if item.status == "at_risk"), ZERO),
            at_risk_count=sum(item.status == "at_risk" for item in all_items),
            renewed_arr=sum((item.renewal_arr or ZERO for item in all_items if item.status == "renewed"), ZERO),
            renewed_count=sum(item.status == "renewed" for item in all_items),
            horizon_months=horizon_months,
        ),
        by_month=[
            RenewalMonthPoint(month=month, **values)
            for month, values in sorted(by_month_data.items())
        ],
    )

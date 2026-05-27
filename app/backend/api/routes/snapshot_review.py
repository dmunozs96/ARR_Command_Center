"""Snapshot comparison endpoints for retroactive ARR data changes."""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.backend.api.schemas import (
    MonthlyTotalPoint,
    PeriodDetailResponse,
    PeriodDetailRow,
    PeriodDetailSummary,
    SnapshotComparisonTotals,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot

router = APIRouter()


def _last_day_of_month(month: date) -> date:
    if month.month == 12:
        return month.replace(day=31)
    return month.replace(month=month.month + 1) - timedelta(days=1)


def _next_month(month: date) -> date:
    if month.month == 12:
        return month.replace(year=month.year + 1, month=1)
    return month.replace(month=month.month + 1)


def _snapshots_or_404(db: Session, snapshot_a_id: UUID, snapshot_b_id: UUID) -> tuple[Snapshot, Snapshot]:
    snapshots = {
        snapshot.id: snapshot
        for snapshot in db.query(Snapshot).filter(Snapshot.id.in_([snapshot_a_id, snapshot_b_id])).all()
    }
    if snapshot_a_id not in snapshots or snapshot_b_id not in snapshots:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshots[snapshot_a_id], snapshots[snapshot_b_id]


def _filtered_items(
    db: Session,
    snapshot_id: UUID,
    product_type: Optional[str],
    product_types: Optional[str],
    account_name: Optional[str],
) -> list[tuple[ARRLineItem, RawOpportunityLineItem]]:
    query = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
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
    return query.all()


def _monthly_totals(rows: list[tuple[ARRLineItem, RawOpportunityLineItem]]) -> dict[date, Decimal]:
    totals: dict[date, Decimal] = {}
    for item, _raw in rows:
        month = item.start_month.replace(day=1)
        while month <= item.end_month_normalized:
            if item.end_month_normalized >= month:
                totals[month] = totals.get(month, Decimal("0")) + Decimal(str(item.annualized_value))
            month = _next_month(month)
    return totals


@router.get("/monthly-totals", response_model=SnapshotComparisonTotals)
def monthly_totals(
    snapshot_a_id: UUID,
    snapshot_b_id: UUID,
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="CSV of product types"),
    account_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snapshot_a, snapshot_b = _snapshots_or_404(db, snapshot_a_id, snapshot_b_id)
    totals_a = _monthly_totals(_filtered_items(db, snapshot_a_id, product_type, product_types, account_name))
    totals_b = _monthly_totals(_filtered_items(db, snapshot_b_id, product_type, product_types, account_name))
    months = sorted(set(totals_a) | set(totals_b))
    common = set(totals_a) & set(totals_b)

    return SnapshotComparisonTotals(
        snapshot_a=snapshot_a,
        snapshot_b=snapshot_b,
        data=[
            MonthlyTotalPoint(month=month, arr_a=totals_a.get(month), arr_b=totals_b.get(month))
            for month in months
        ],
        months_common=len(common),
        months_only_in_a=len(set(totals_a) - set(totals_b)),
        months_only_in_b=len(set(totals_b) - set(totals_a)),
        data_identical=bool(
            snapshot_a.data_hash
            and snapshot_b.data_hash
            and snapshot_a.data_hash == snapshot_b.data_hash
        ),
    )


def _items_for_month(
    db: Session,
    snapshot_id: UUID,
    month: date,
    product_type: Optional[str],
    product_types: Optional[str],
    account_name: Optional[str],
) -> dict[str, tuple[ARRLineItem, RawOpportunityLineItem]]:
    month_start = month.replace(day=1)
    month_end = _last_day_of_month(month_start)
    rows = _filtered_items(db, snapshot_id, product_type, product_types, account_name)
    return {
        raw.sf_line_item_id: (item, raw)
        for item, raw in rows
        if item.start_month <= month_end and item.end_month_normalized >= month_start
    }


@router.get("/period-detail", response_model=PeriodDetailResponse)
def period_detail(
    snapshot_a_id: UUID,
    snapshot_b_id: UUID,
    month: date,
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="CSV of product types"),
    account_name: Optional[str] = Query(None),
    only_changes: bool = Query(False),
    db: Session = Depends(get_db),
):
    _snapshots_or_404(db, snapshot_a_id, snapshot_b_id)
    month_start = month.replace(day=1)
    items_a = _items_for_month(db, snapshot_a_id, month_start, product_type, product_types, account_name)
    items_b = _items_for_month(db, snapshot_b_id, month_start, product_type, product_types, account_name)
    rows: list[PeriodDetailRow] = []
    counts = {"new": 0, "removed": 0, "modified": 0, "unchanged": 0}
    total_delta = Decimal("0")

    for line_id in sorted(set(items_a) | set(items_b)):
        item_a, raw_a = items_a.get(line_id, (None, None))
        item_b, raw_b = items_b.get(line_id, (None, None))
        raw = raw_b or raw_a
        item = item_b or item_a
        arr_a = Decimal(str(item_a.annualized_value)) if item_a else Decimal("0")
        arr_b = Decimal(str(item_b.annualized_value)) if item_b else Decimal("0")
        delta = arr_b - arr_a
        if not item_a:
            change_type = "new"
        elif not item_b:
            change_type = "removed"
        elif arr_a != arr_b:
            change_type = "modified"
        else:
            change_type = "unchanged"

        counts[change_type] += 1
        total_delta += delta
        if only_changes and change_type == "unchanged":
            continue
        rows.append(
            PeriodDetailRow(
                sf_line_item_id=line_id,
                sf_opportunity_id=raw.sf_opportunity_id or "",
                opportunity_name=raw.opportunity_name or "",
                account_name=raw.account_name or "",
                business_line=raw.business_line or "",
                product_type=item.product_type or "",
                consultant=raw.opportunity_owner or "",
                arr_a=arr_a,
                arr_b=arr_b,
                delta=delta,
                delta_pct=round(float(delta / arr_a * 100), 2) if arr_a else None,
                change_type=change_type,
            )
        )

    return PeriodDetailResponse(
        month=month_start,
        rows=rows,
        summary=PeriodDetailSummary(total_delta=total_delta, **counts),
    )

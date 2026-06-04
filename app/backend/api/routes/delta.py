"""Committed vs Real delta analytics."""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.backend.api.schemas import (
    BLDistributionStats,
    DeltaContractItem,
    DeltaMonthBreakdownResponse,
    DeltaMonthPoint,
    DeltaMonthlyTrendResponse,
    ImplementationAlertItem,
    ImplementationAlertsResponse,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot

router = APIRouter()

ZERO = Decimal("0")


def _add_months(month: date, months: int) -> date:
    offset = month.year * 12 + month.month - 1 + months
    return date(offset // 12, offset % 12 + 1, 1)


def _month_range(start: date, end: date) -> list[date]:
    months: list[date] = []
    current = start.replace(day=1)
    end = end.replace(day=1)
    while current <= end:
        months.append(current)
        current = _add_months(current, 1)
    return months


def _latest_completed_snapshot(db: Session, snapshot_id: Optional[UUID]) -> Snapshot:
    q = db.query(Snapshot).filter(Snapshot.status == "completed")
    if snapshot_id:
        q = q.filter(Snapshot.id == snapshot_id)
    snap = q.order_by(Snapshot.created_at.desc()).first()
    if not snap:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No completed snapshot found")
    return snap


def _percentile(sorted_values: list[float], value: float) -> float:
    """Fraction of sorted_values <= value, as 0-100."""
    if not sorted_values:
        return 0.0
    count = sum(1 for v in sorted_values if v <= value)
    return count / len(sorted_values) * 100


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    if n % 2 == 1:
        return s[n // 2]
    return (s[n // 2 - 1] + s[n // 2]) / 2.0


def _percentile_value(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    idx = p / 100 * (len(s) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(s) - 1)
    frac = idx - lo
    return s[lo] + frac * (s[hi] - s[lo])


def _apply_pt_filter(q, product_type: Optional[str], product_types: Optional[str]):
    if product_types:
        pts = [v.strip() for v in product_types.split(",") if v.strip()]
        if pts:
            return q.filter(ARRLineItem.product_type.in_(pts))
    if product_type:
        return q.filter(ARRLineItem.product_type == product_type)
    return q


@router.get("/monthly-trend", response_model=DeltaMonthlyTrendResponse)
def get_monthly_trend(
    snapshot_id: Optional[UUID] = Query(None),
    month_from: date = Query(...),
    month_to: date = Query(...),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snap = _latest_completed_snapshot(db, snapshot_id)

    base_q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snap.id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
            RawOpportunityLineItem.close_date.isnot(None),
        )
    )
    base_q = _apply_pt_filter(base_q, product_type, product_types)

    rows = base_q.all()

    month_from = month_from.replace(day=1)
    month_to = month_to.replace(day=1)
    months = _month_range(month_from, month_to)

    result_months: list[DeltaMonthPoint] = []
    for m in months:
        committed_arr = ZERO
        real_arr = ZERO
        delta_total = ZERO
        contracts_in_transit = 0
        delta_by_pt: dict[str, Decimal] = {}

        for arr_item, raw_item in rows:
            close_month = raw_item.close_date.replace(day=1)
            start_month = arr_item.start_month.replace(day=1)
            end_month = arr_item.end_month_normalized.replace(day=1)
            val = Decimal(str(arr_item.annualized_value))
            pt = arr_item.product_type or "Otro"

            if close_month <= m <= end_month:
                committed_arr += val
            if start_month <= m <= end_month:
                real_arr += val
            if close_month <= m and start_month > m:
                delta_total += val
                contracts_in_transit += 1
                delta_by_pt[pt] = delta_by_pt.get(pt, ZERO) + val

        result_months.append(DeltaMonthPoint(
            month=m,
            committed_arr=committed_arr,
            real_arr=real_arr,
            delta_total=delta_total,
            contracts_in_transit=contracts_in_transit,
            delta_by_product_type=delta_by_pt,
        ))

    trend_note = _compute_trend_note(result_months)
    return DeltaMonthlyTrendResponse(months=result_months, trend_note=trend_note)


def _compute_trend_note(months: list[DeltaMonthPoint]) -> str:
    if len(months) < 3:
        return "mixta"
    last3 = [m.delta_total for m in months[-3:]]
    d0, d1, d2 = last3[0], last3[1], last3[2]
    if d1 > d0 and d2 > d1:
        return "ascendente"
    if d1 < d0 and d2 < d1:
        return "descendente"
    max_val = max(abs(d0), abs(d1), abs(d2))
    if max_val > 0:
        max_variation = max(abs(d2 - d0), abs(d1 - d0), abs(d2 - d1)) / max_val
        if max_variation < Decimal("0.10"):
            return "estable"
    return "mixta"


@router.get("/month-breakdown", response_model=DeltaMonthBreakdownResponse)
def get_month_breakdown(
    snapshot_id: Optional[UUID] = Query(None),
    month: date = Query(...),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None),
    account_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snap = _latest_completed_snapshot(db, snapshot_id)
    today = date.today()
    month = month.replace(day=1)

    base_q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snap.id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
            RawOpportunityLineItem.close_date.isnot(None),
        )
    )
    base_q = _apply_pt_filter(base_q, product_type, product_types)
    if account_name:
        base_q = base_q.filter(RawOpportunityLineItem.account_name == account_name)

    rows = base_q.all()

    contracts: list[DeltaContractItem] = []
    total_delta = ZERO

    for arr_item, raw_item in rows:
        close_month = raw_item.close_date.replace(day=1)
        start_month = arr_item.start_month.replace(day=1)
        if close_month <= month and start_month > month:
            val = Decimal(str(arr_item.annualized_value))
            total_delta += val
            days_since_close = (today - raw_item.close_date).days
            contracts.append(DeltaContractItem(
                opportunity_name=raw_item.opportunity_name,
                account_name=raw_item.account_name,
                product_type=arr_item.product_type,
                arr_value=val,
                close_date=raw_item.close_date,
                subscription_start_date=raw_item.subscription_start_date,
                days_since_close=days_since_close,
            ))

    contracts.sort(key=lambda c: c.days_since_close, reverse=True)
    return DeltaMonthBreakdownResponse(month=month, total_delta=total_delta, contracts=contracts)


@router.get("/implementation-alerts", response_model=ImplementationAlertsResponse)
def get_implementation_alerts(
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=200),
    db: Session = Depends(get_db),
):
    snap = _latest_completed_snapshot(db, snapshot_id)
    today = date.today()

    # Build historical distributions (completed contracts, start already happened)
    hist_q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snap.id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
            ARRLineItem.used_start_fallback == False,
            RawOpportunityLineItem.close_date.isnot(None),
            RawOpportunityLineItem.subscription_start_date.isnot(None),
        )
    )

    bl_days: dict[str, list[float]] = {}
    for arr_item, raw_item in hist_q.all():
        if raw_item.subscription_start_date <= today and raw_item.subscription_start_date > raw_item.close_date:
            pt = arr_item.product_type or "Otro"
            days = (raw_item.subscription_start_date - raw_item.close_date).days
            bl_days.setdefault(pt, []).append(float(days))

    bl_stats: dict[str, BLDistributionStats] = {}
    for pt, days_list in bl_days.items():
        n = len(days_list)
        bl_stats[pt] = BLDistributionStats(
            product_type=pt,
            median_days=_median(days_list),
            p75_days=_percentile_value(days_list, 75),
            p90_days=_percentile_value(days_list, 90),
            sample_size=n,
            is_reliable=n >= 10,
        )

    # Pending contracts (service not started yet)
    pending_q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snap.id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
            RawOpportunityLineItem.close_date.isnot(None),
            ARRLineItem.start_month > today,
        )
    )
    pending_q = _apply_pt_filter(pending_q, product_type, product_types)

    reliable_alerts: list[ImplementationAlertItem] = []
    unreliable_alerts: list[ImplementationAlertItem] = []

    for arr_item, raw_item in pending_q.all():
        pt = arr_item.product_type or "Otro"
        days_since_close = (today - raw_item.close_date).days
        stats = bl_stats.get(pt)
        is_reliable = stats is not None and stats.is_reliable
        pct_rank: Optional[float] = None
        if is_reliable and stats:
            pct_rank = _percentile(bl_days[pt], float(days_since_close))

        item = ImplementationAlertItem(
            opportunity_name=raw_item.opportunity_name,
            account_name=raw_item.account_name,
            product_type=pt,
            arr_value=Decimal(str(arr_item.annualized_value)),
            close_date=raw_item.close_date,
            subscription_start_date=raw_item.subscription_start_date,
            days_since_close=days_since_close,
            percentile_rank=pct_rank,
            bl_median_days=stats.median_days if stats else 0.0,
            bl_p90_days=stats.p90_days if stats else 0.0,
            is_statistically_reliable=is_reliable,
        )
        if is_reliable:
            reliable_alerts.append(item)
        else:
            unreliable_alerts.append(item)

    reliable_alerts.sort(key=lambda a: a.percentile_rank or 0, reverse=True)
    unreliable_alerts.sort(key=lambda a: a.days_since_close, reverse=True)

    all_alerts = (reliable_alerts + unreliable_alerts)[:limit]
    total_in_transit = len(reliable_alerts) + len(unreliable_alerts)

    return ImplementationAlertsResponse(
        alerts=all_alerts,
        bl_distributions=bl_stats,
        total_contracts_in_transit=total_in_transit,
        as_of_date=today,
    )

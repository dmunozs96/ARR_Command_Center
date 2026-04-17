"""
ARR endpoints:
  GET /api/arr/summary
  GET /api/arr/by-consultant
  GET /api/arr/line-items
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.backend.api.schemas import (
    ARRByConsultantResponse,
    ARRLineItemOut,
    ARRLineItemsResponse,
    ARRMonthPoint,
    ARRSummaryResponse,
    ConsultantARR,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, ARRMonthlySummary, RawOpportunityLineItem, Snapshot

router = APIRouter()


def _latest_snapshot_id(db: Session) -> UUID:
    snap = (
        db.query(Snapshot)
        .filter(Snapshot.status == "completed")
        .order_by(Snapshot.created_at.desc())
        .first()
    )
    if not snap:
        raise HTTPException(status_code=404, detail="No completed snapshot found")
    return snap.id


@router.get("/summary", response_model=ARRSummaryResponse)
def arr_summary(
    snapshot_id: Optional[UUID] = Query(None),
    month_from: Optional[date] = Query(None),
    month_to: Optional[date] = Query(None),
    product_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sid = snapshot_id or _latest_snapshot_id(db)

    q = db.query(ARRMonthlySummary).filter(ARRMonthlySummary.snapshot_id == sid)
    if month_from:
        q = q.filter(ARRMonthlySummary.month >= month_from)
    if month_to:
        q = q.filter(ARRMonthlySummary.month <= month_to)
    if product_type:
        q = q.filter(ARRMonthlySummary.product_type == product_type)

    rows = q.order_by(ARRMonthlySummary.month).all()

    # Group by month
    months_map: dict[date, dict] = {}
    for row in rows:
        m = row.month
        if m not in months_map:
            months_map[m] = {}
        months_map[m][row.product_type] = Decimal(str(row.arr_value))

    sorted_months = sorted(months_map.keys())
    points: List[ARRMonthPoint] = []
    prev_total: Optional[Decimal] = None

    for m in sorted_months:
        by_type = months_map[m]
        total = sum(by_type.values(), Decimal("0"))
        mom_change = (total - prev_total) if prev_total is not None else None
        mom_pct = (
            float(mom_change / prev_total * 100)
            if mom_change is not None and prev_total and prev_total != 0
            else None
        )
        points.append(
            ARRMonthPoint(
                month=m,
                total_arr=total,
                by_product_type=by_type,
                mom_change=mom_change,
                mom_pct=round(mom_pct, 2) if mom_pct is not None else None,
            )
        )
        prev_total = total

    return ARRSummaryResponse(snapshot_id=sid, months=points)


@router.get("/by-consultant", response_model=ARRByConsultantResponse)
def arr_by_consultant(
    snapshot_id: Optional[UUID] = Query(None),
    month: Optional[date] = Query(None),
    country: Optional[str] = Query(None),
    product_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sid = snapshot_id or _latest_snapshot_id(db)

    # Default month: latest available
    if month is None:
        latest_month = (
            db.query(func.max(ARRMonthlySummary.month))
            .filter(ARRMonthlySummary.snapshot_id == sid)
            .scalar()
        )
        if not latest_month:
            raise HTTPException(status_code=404, detail="No summary data for snapshot")
        month = latest_month

    month_start = month.replace(day=1)

    # Query arr_line_items + raw for the given month
    q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == sid)
        .filter(ARRLineItem.is_saas == True)
        .filter(ARRLineItem.start_month <= month_start)
        .filter(ARRLineItem.end_month_normalized >= month_start)
    )
    if product_type:
        q = q.filter(ARRLineItem.product_type == product_type)
    if country:
        q = q.filter(ARRLineItem.consultant_country == country)

    rows = q.all()

    # Build by-consultant aggregation
    consultant_data: dict[str, dict] = {}
    for arr_item, raw_item in rows:
        name = raw_item.opportunity_owner or "Unknown"
        if name not in consultant_data:
            consultant_data[name] = {
                "country": arr_item.consultant_country or "Unknown",
                "total": Decimal("0"),
                "by_type": {},
            }
        consultant_data[name]["total"] += Decimal(str(arr_item.annualized_value))
        pt = arr_item.product_type or "Unknown"
        consultant_data[name]["by_type"][pt] = (
            consultant_data[name]["by_type"].get(pt, Decimal("0"))
            + Decimal(str(arr_item.annualized_value))
        )

    # Compute MoM for each consultant using previous month
    if month_start.month == 1:
        prev_month = month_start.replace(year=month_start.year - 1, month=12)
    else:
        prev_month = month_start.replace(month=month_start.month - 1)

    prev_q = (
        db.query(func.sum(ARRLineItem.annualized_value), RawOpportunityLineItem.opportunity_owner)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == sid)
        .filter(ARRLineItem.is_saas == True)
        .filter(ARRLineItem.start_month <= prev_month)
        .filter(ARRLineItem.end_month_normalized >= prev_month)
        .group_by(RawOpportunityLineItem.opportunity_owner)
        .all()
    )
    prev_totals = {name: Decimal(str(v)) for v, name in prev_q if name}

    consultants = []
    for name, data in sorted(consultant_data.items(), key=lambda x: x[1]["total"], reverse=True):
        prev_total = prev_totals.get(name, Decimal("0"))
        mom_change = data["total"] - prev_total if prev_total is not None else None
        mom_pct = (
            round(float(mom_change / prev_total * 100), 2)
            if mom_change and prev_total and prev_total != 0
            else None
        )
        consultants.append(
            ConsultantARR(
                name=name,
                country=data["country"],
                arr_total=data["total"],
                by_product_type=data["by_type"],
                mom_change=mom_change,
                mom_pct=mom_pct,
            )
        )

    return ARRByConsultantResponse(snapshot_id=sid, month=month_start, consultants=consultants)


@router.get("/line-items", response_model=ARRLineItemsResponse)
def arr_line_items(
    snapshot_id: Optional[UUID] = Query(None),
    is_saas: Optional[bool] = Query(None),
    product_type: Optional[str] = Query(None),
    consultant: Optional[str] = Query(None),
    has_flags: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    sid = snapshot_id or _latest_snapshot_id(db)

    q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == sid)
    )
    if is_saas is not None:
        q = q.filter(ARRLineItem.is_saas == is_saas)
    if product_type:
        q = q.filter(ARRLineItem.product_type == product_type)
    if consultant:
        q = q.filter(RawOpportunityLineItem.opportunity_owner == consultant)
    if has_flags is True:
        q = q.filter(ARRLineItem.data_quality_flags != [])
    if has_flags is False:
        q = q.filter(ARRLineItem.data_quality_flags == [])

    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for arr_item, raw_item in rows:
        items.append(
            ARRLineItemOut(
                id=arr_item.id,
                snapshot_id=arr_item.snapshot_id,
                sf_opportunity_id=raw_item.sf_opportunity_id,
                sf_line_item_id=raw_item.sf_line_item_id,
                opportunity_name=raw_item.opportunity_name,
                account_name=raw_item.account_name,
                opportunity_owner=raw_item.opportunity_owner,
                product_name=raw_item.product_name,
                product_type=arr_item.product_type,
                is_saas=arr_item.is_saas,
                effective_start_date=arr_item.effective_start_date,
                effective_end_date=arr_item.effective_end_date,
                start_month=arr_item.start_month,
                end_month_normalized=arr_item.end_month_normalized,
                service_days=arr_item.service_days,
                real_price=arr_item.real_price,
                annualized_value=arr_item.annualized_value,
                consultant_country=arr_item.consultant_country,
                data_quality_flags=arr_item.data_quality_flags or [],
                used_start_fallback=arr_item.used_start_fallback,
                used_end_fallback=arr_item.used_end_fallback,
            )
        )

    return ARRLineItemsResponse(
        snapshot_id=sid,
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )

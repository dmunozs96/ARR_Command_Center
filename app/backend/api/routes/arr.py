"""
ARR endpoints:
  GET   /api/arr/summary
  GET   /api/arr/by-consultant
  GET   /api/arr/line-items
  PATCH /api/arr/line-items/{id}
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.backend.api.schemas import (
    AccountARR,
    ARRByAccountResponse,
    ARRByConsultantResponse,
    ARRLineItemOut,
    ARRLineItemsResponse,
    ARRMonthPoint,
    ARRSummaryResponse,
    ConsultantARR,
    LineItemExcludePatch,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, ARRMonthlySummary, RawOpportunityLineItem, Snapshot, SnapshotStripeMRR

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


def _latest_snapshot_id_or_none(db: Session) -> Optional[UUID]:
    snap = (
        db.query(Snapshot)
        .filter(Snapshot.status == "completed")
        .order_by(Snapshot.created_at.desc())
        .first()
    )
    return snap.id if snap else None


def _last_day_of_month(first_day: date) -> date:
    if first_day.month == 12:
        return first_day.replace(day=31)
    return first_day.replace(month=first_day.month + 1) - timedelta(days=1)


def _month_range(start: date, end: date) -> List[date]:
    months = []
    current = start.replace(day=1)
    end_first = end.replace(day=1)
    while current <= end_first:
        months.append(current)
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months


def _active_start_month(arr: ARRLineItem, raw: RawOpportunityLineItem, mode: str) -> date:
    if mode == "from_close":
        opp_type = (raw.opportunity_type or "").lower().strip()
        if (
            opp_type == "nuevo negocio"
            and raw.subscription_start_date
            and raw.close_date < raw.subscription_start_date
        ):
            return raw.close_date.replace(day=1)
    return arr.start_month


@router.get("/summary", response_model=ARRSummaryResponse)
def arr_summary(
    snapshot_id: Optional[UUID] = Query(None),
    month_from: Optional[date] = Query(None),
    month_to: Optional[date] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="CSV of product types"),
    account_name: Optional[str] = Query(None, description="Filter by account/client name"),
    mode: str = Query("from_start", description="from_start | from_close"),
    db: Session = Depends(get_db),
):
    """
    Returns ARR monthly series computed live from arr_line_items, respecting
    excluded_from_arr flags. Two modes:
      from_start (default): item start = subscription start date
      from_close:           item start = opportunity close_date (backlog view)
    """
    sid = snapshot_id or _latest_snapshot_id(db)

    product_type_list: Optional[List[str]] = None
    if product_types and product_types.strip():
        product_type_list = [p.strip() for p in product_types.split(",") if p.strip()]

    if mode == "from_close":
        q_close = (
            db.query(ARRLineItem, RawOpportunityLineItem)
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(
                ARRLineItem.snapshot_id == sid,
                ARRLineItem.is_saas == True,
                ARRLineItem.excluded_from_arr == False,
            )
        )
        if account_name:
            q_close = q_close.filter(RawOpportunityLineItem.account_name == account_name)
        rows = q_close.all()
        # "Fecha de Cierre" logic (mirrors Excel col30 / f.inicial si es NN):
        # For Nuevo Negocio deals where close_date precedes subscription_start_date,
        # ARR is recognized from the close month so booked deals appear when signed.
        # All other deals use start_month (identical to from_start mode).
        active_items = []
        for arr, raw in rows:
            active_start = _active_start_month(arr, raw, mode)
            if active_start <= arr.end_month_normalized:
                active_items.append((
                    active_start,
                    arr.end_month_normalized,
                    arr.product_type,
                    Decimal(str(arr.annualized_value)),
                ))
    else:
        q = (
            db.query(ARRLineItem, RawOpportunityLineItem)
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(
                ARRLineItem.snapshot_id == sid,
                ARRLineItem.is_saas == True,
                ARRLineItem.excluded_from_arr == False,
            )
        )
        if account_name:
            q = q.filter(RawOpportunityLineItem.account_name == account_name)
        rows = q.all()
        active_items = [
            (
                arr.start_month,
                arr.end_month_normalized,
                arr.product_type,
                Decimal(str(arr.annualized_value)),
            )
            for arr, _raw in rows
        ]

    include_stripe = (
        not account_name
        and ((not product_type and not product_type_list)
        or product_type == "Author Online"
        or (product_type_list is not None and "Author Online" in product_type_list))
    )
    stripe_by_month: dict[date, Decimal] = {}
    if include_stripe:
        stripe_rows = (
            db.query(SnapshotStripeMRR)
            .filter(SnapshotStripeMRR.snapshot_id == sid)
            .all()
        )
        stripe_by_month = {
            row.month.replace(day=1): Decimal(str(row.mrr))
            for row in stripe_rows
        }

    if not active_items and not stripe_by_month:
        return ARRSummaryResponse(snapshot_id=sid, months=[])

    # Determine visible month range
    candidate_starts = [i[0] for i in active_items] + list(stripe_by_month.keys())
    candidate_ends = [i[1] for i in active_items] + list(stripe_by_month.keys())
    range_start = month_from.replace(day=1) if month_from else min(candidate_starts)
    range_end = month_to.replace(day=1) if month_to else max(candidate_ends)

    if range_start > range_end:
        return ARRSummaryResponse(snapshot_id=sid, months=[])

    # Optional product_type filter
    if product_type_list:
        active_items = [i for i in active_items if i[2] in product_type_list]
    if product_type:
        active_items = [i for i in active_items if i[2] == product_type]

    months_list = _month_range(range_start, range_end)

    months_map: dict[date, dict[str, Decimal]] = {}
    for month_start in months_list:
        month_end = _last_day_of_month(month_start)
        by_type: dict[str, Decimal] = {}
        for start, end, ptype, arr_val in active_items:
            if start <= month_end and end >= month_start:
                pt = ptype or "Unknown"
                by_type[pt] = by_type.get(pt, Decimal("0")) + arr_val
        if month_start in stripe_by_month:
            by_type["Author Online"] = by_type.get("Author Online", Decimal("0")) + stripe_by_month[month_start]
        if by_type:
            months_map[month_start] = by_type

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


@router.get("/by-account", response_model=ARRByAccountResponse)
def arr_by_account(
    snapshot_id: Optional[UUID] = Query(None),
    month_from: Optional[date] = Query(None),
    month_to: Optional[date] = Query(None),
    product_types: Optional[str] = Query(None, description="CSV of product types"),
    product_type: Optional[str] = Query(None, description="Single product type filter (for consultant drill-down)"),
    consultant: Optional[str] = Query(None, description="Filter by consultant (opportunity_owner)"),
    account_name: Optional[str] = Query(None, description="Filter by account/client name"),
    limit: int = Query(default=20, ge=1, le=100),
    mode: str = Query(default="from_start", description="from_start | from_close"),
    db: Session = Depends(get_db),
):
    """
    Returns top N accounts by ARR for a given snapshot, month range, and product type filter.
    Includes an 'Otros' bucket for the remaining accounts.
    """
    sid = snapshot_id or _latest_snapshot_id(db)

    product_type_list: Optional[List[str]] = None
    if product_types and product_types.strip():
        product_type_list = [p.strip() for p in product_types.split(",") if p.strip()]

    # Resolve month range using same logic as summary endpoint
    if mode == "from_close":
        q_close = (
            db.query(ARRLineItem, RawOpportunityLineItem)
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(
                ARRLineItem.snapshot_id == sid,
                ARRLineItem.is_saas == True,
                ARRLineItem.excluded_from_arr == False,
            )
        )
        if consultant:
            q_close = q_close.filter(RawOpportunityLineItem.opportunity_owner == consultant)
        if account_name:
            q_close = q_close.filter(RawOpportunityLineItem.account_name == account_name)
        rows = q_close.all()
        active_items = []
        for arr, raw in rows:
            if product_type_list and arr.product_type not in product_type_list:
                continue
            if product_type and arr.product_type != product_type:
                continue
            active_start = _active_start_month(arr, raw, mode)
            if active_start <= arr.end_month_normalized:
                active_items.append((
                    active_start,
                    arr.end_month_normalized,
                    arr.product_type,
                    Decimal(str(arr.annualized_value)),
                    raw.account_name or "Sin cuenta",
                ))
    else:
        q = (
            db.query(ARRLineItem, RawOpportunityLineItem)
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(
                ARRLineItem.snapshot_id == sid,
                ARRLineItem.is_saas == True,
                ARRLineItem.excluded_from_arr == False,
            )
        )
        if product_type_list:
            q = q.filter(ARRLineItem.product_type.in_(product_type_list))
        if product_type:
            q = q.filter(ARRLineItem.product_type == product_type)
        if consultant:
            q = q.filter(RawOpportunityLineItem.opportunity_owner == consultant)
        if account_name:
            q = q.filter(RawOpportunityLineItem.account_name == account_name)
        rows = q.all()
        active_items = [
            (
                arr.start_month,
                arr.end_month_normalized,
                arr.product_type,
                Decimal(str(arr.annualized_value)),
                raw.account_name or "Sin cuenta",
            )
            for arr, raw in rows
        ]

    if not active_items:
        empty_account = AccountARR(
            rank=0,
            account_name="Otros",
            total_arr=Decimal("0"),
            by_month={},
            first_month_arr=Decimal("0"),
            last_month_arr=Decimal("0"),
            delta=Decimal("0"),
        )
        return ARRByAccountResponse(
            snapshot_id=sid,
            months=[],
            accounts=[],
            others=empty_account,
            total_arr=Decimal("0"),
        )

    # Determine month range
    candidate_starts = [i[0] for i in active_items]
    candidate_ends = [i[1] for i in active_items]
    range_start = month_from.replace(day=1) if month_from else min(candidate_starts)
    range_end = month_to.replace(day=1) if month_to else max(candidate_ends)

    if range_start > range_end:
        range_start = range_end

    months_list = _month_range(range_start, range_end)

    # Accumulate ARR by account per month
    account_by_month: dict[str, dict[date, Decimal]] = {}
    for item_start, item_end, _ptype, arr_val, account in active_items:
        if account not in account_by_month:
            account_by_month[account] = {}
        for month_start in months_list:
            month_end = _last_day_of_month(month_start)
            if item_start <= month_end and item_end >= month_start:
                account_by_month[account][month_start] = (
                    account_by_month[account].get(month_start, Decimal("0")) + arr_val
                )

    # Compute totals and sort
    account_totals = {
        acct: sum(monthly.values(), Decimal("0"))
        for acct, monthly in account_by_month.items()
    }
    sorted_accounts = sorted(account_totals.items(), key=lambda x: x[1], reverse=True)

    top_names = [name for name, _ in sorted_accounts[:limit]]
    other_names = [name for name, _ in sorted_accounts[limit:]]

    first_month = months_list[0]
    last_month = months_list[-1]
    months_str = [m.isoformat() for m in months_list]

    def build_account_arr(rank: int, name: str, monthly: dict[date, Decimal]) -> AccountARR:
        by_month_str = {m.isoformat(): monthly.get(m, Decimal("0")) for m in months_list}
        total = sum(monthly.values(), Decimal("0"))
        first_arr = monthly.get(first_month, Decimal("0"))
        last_arr = monthly.get(last_month, Decimal("0"))
        return AccountARR(
            rank=rank,
            account_name=name,
            total_arr=total,
            by_month=by_month_str,
            first_month_arr=first_arr,
            last_month_arr=last_arr,
            delta=last_arr - first_arr,
        )

    accounts = [
        build_account_arr(i + 1, name, account_by_month[name])
        for i, name in enumerate(top_names)
    ]

    # Build "Otros" bucket
    others_monthly: dict[date, Decimal] = {}
    for name in other_names:
        for m, v in account_by_month[name].items():
            others_monthly[m] = others_monthly.get(m, Decimal("0")) + v

    others = build_account_arr(0, "Otros", others_monthly)
    others.account_name = "Otros"

    grand_total = sum(account_totals.values(), Decimal("0"))

    return ARRByAccountResponse(
        snapshot_id=sid,
        months=months_str,
        accounts=accounts,
        others=others,
        total_arr=grand_total,
    )


@router.get("/by-consultant", response_model=ARRByConsultantResponse)
def arr_by_consultant(
    snapshot_id: Optional[UUID] = Query(None),
    month: Optional[date] = Query(None),
    country: Optional[str] = Query(None),
    product_type: Optional[str] = Query(None),
    mode: str = Query(default="from_start", description="from_start | from_close"),
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

    q = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == sid)
        .filter(ARRLineItem.is_saas == True)
        .filter(ARRLineItem.excluded_from_arr == False)
    )
    if product_type:
        q = q.filter(ARRLineItem.product_type == product_type)
    if country:
        q = q.filter(ARRLineItem.consultant_country == country)

    rows = [
        (arr_item, raw_item)
        for arr_item, raw_item in q.all()
        if _active_start_month(arr_item, raw_item, mode) <= month_start
        and arr_item.end_month_normalized >= month_start
    ]

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

    if month_start.month == 1:
        prev_month = month_start.replace(year=month_start.year - 1, month=12)
    else:
        prev_month = month_start.replace(month=month_start.month - 1)

    prev_rows = [
        (arr_item, raw_item)
        for arr_item, raw_item in q.all()
        if _active_start_month(arr_item, raw_item, mode) <= prev_month
        and arr_item.end_month_normalized >= prev_month
    ]
    prev_totals: dict[str, Decimal] = {}
    for arr_item, raw_item in prev_rows:
        name = raw_item.opportunity_owner
        if name:
            prev_totals[name] = prev_totals.get(name, Decimal("0")) + Decimal(str(arr_item.annualized_value))

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
                excluded_from_arr=arr_item.excluded_from_arr or False,
            )
        )

    return ARRLineItemsResponse(
        snapshot_id=sid,
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.patch("/line-items/{item_id}", response_model=ARRLineItemOut)
def patch_line_item(item_id: UUID, body: LineItemExcludePatch, db: Session = Depends(get_db)):
    """Toggle excluded_from_arr on a single ARRLineItem."""
    arr_item = db.query(ARRLineItem).filter(ARRLineItem.id == item_id).first()
    if not arr_item:
        raise HTTPException(status_code=404, detail="Line item not found")

    raw_item = (
        db.query(RawOpportunityLineItem)
        .filter(RawOpportunityLineItem.id == arr_item.raw_line_item_id)
        .first()
    )

    arr_item.excluded_from_arr = body.excluded_from_arr
    db.commit()
    db.refresh(arr_item)

    return ARRLineItemOut(
        id=arr_item.id,
        snapshot_id=arr_item.snapshot_id,
        sf_opportunity_id=raw_item.sf_opportunity_id if raw_item else "",
        sf_line_item_id=raw_item.sf_line_item_id if raw_item else "",
        opportunity_name=raw_item.opportunity_name if raw_item else None,
        account_name=raw_item.account_name if raw_item else None,
        opportunity_owner=raw_item.opportunity_owner if raw_item else None,
        product_name=raw_item.product_name if raw_item else "",
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
        excluded_from_arr=arr_item.excluded_from_arr,
    )

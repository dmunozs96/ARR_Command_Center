"""Retention and churn analytics for Salesforce ARR."""

from datetime import date
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.backend.api.routes.gagero import _get_arr_by_account_bl
from app.backend.api.schemas import (
    ChurnByProductTypePoint,
    ChurnByProductTypeResponse,
    ChurnRatiosResponse,
    ChurnRollingPoint,
    ChurnRollingResponse,
    ChurnedAccount,
    ChurnedAccountsResponse,
    MonthlyChurnItem,
    MonthlyChurnResponse,
    MonthlyChurnSummary,
    MonthlyChurnTrendResponse,
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, Snapshot, SnapshotStripeMRR

router = APIRouter()

Window = Literal["ltm", "ytd"]
ZERO = Decimal("0")
ONLINE_KEY = ("[Author Online Stripe]", "Author Online")


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


def _month_a(month_b: date, window: Window) -> date:
    month_b = month_b.replace(day=1)
    return _add_months(month_b, -12) if window == "ltm" else date(month_b.year, 1, 1)


def _snapshot_or_404(db: Session, snapshot_id: Optional[UUID]) -> Snapshot:
    query = db.query(Snapshot).filter(Snapshot.status == "completed")
    if snapshot_id:
        query = query.filter(Snapshot.id == snapshot_id)
    else:
        query = query.order_by(Snapshot.created_at.desc())
    snapshot = query.first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No completed snapshot found")
    return snapshot


def _compute_ratios(
    db: Session,
    snapshot_id: UUID,
    month_a: date,
    month_b: date,
    product_type: Optional[str],
    account_name: Optional[str],
    product_types: Optional[str] = None,
) -> dict:
    arr_a = _get_arr_by_account_bl(db, snapshot_id, month_a, product_type, account_name, product_types)
    arr_b = _get_arr_by_account_bl(db, snapshot_id, month_b, product_type, account_name, product_types)
    cohort = {key: value for key, value in arr_a.items() if value > ZERO}
    arr_start = sum(cohort.values(), ZERO)

    churn_eur = sum((value for key, value in cohort.items() if arr_b.get(key, ZERO) == ZERO), ZERO)
    down_eur = sum(
        (value - arr_b[key] for key, value in cohort.items() if ZERO < arr_b.get(key, ZERO) < value),
        ZERO,
    )
    up_eur = sum(
        (arr_b[key] - value for key, value in cohort.items() if arr_b.get(key, ZERO) > value),
        ZERO,
    )
    churned_logos = sum(1 for key in cohort if arr_b.get(key, ZERO) == ZERO)

    if arr_start:
        grr = float((arr_start - churn_eur - down_eur) / arr_start * 100)
        nrr = float((arr_start - churn_eur - down_eur + up_eur) / arr_start * 100)
        logo_rate = float(Decimal(churned_logos) / Decimal(len(cohort)) * 100)
    else:
        grr = nrr = logo_rate = 0.0

    return {
        "nrr": nrr,
        "grr": min(grr, 100.0),
        "logo_churn_rate": logo_rate,
        "churned_arr": churn_eur,
        "arr_cohort_start": arr_start,
        "churned_logos": churned_logos,
        "total_logos": len(cohort),
        "churn_eur": churn_eur,
        "down_selling_eur": down_eur,
        "up_selling_eur": up_eur,
        "cohort": cohort,
        "arr_b": arr_b,
    }


def _data_bounds(db: Session, snapshot_id: UUID) -> tuple[Optional[date], Optional[date]]:
    return (
        db.query(func.min(ARRLineItem.start_month), func.max(ARRLineItem.end_month_normalized))
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
        .one()
    )


def _includes_author_online(
    product_type: Optional[str],
    product_types: Optional[str],
    account_name: Optional[str],
) -> bool:
    if account_name:
        return False
    product_type_list = [value.strip() for value in product_types.split(",") if value.strip()] if product_types else []
    return (
        (not product_type and not product_type_list)
        or product_type == "Author Online"
        or "Author Online" in product_type_list
    )


def _get_author_online_arr(
    db: Session,
    snapshot_id: UUID,
    month: date,
    product_type: Optional[str],
    account_name: Optional[str],
    product_types: Optional[str] = None,
) -> Decimal:
    if not _includes_author_online(product_type, product_types, account_name):
        return ZERO
    row = (
        db.query(SnapshotStripeMRR)
        .filter(SnapshotStripeMRR.snapshot_id == snapshot_id, SnapshotStripeMRR.month == month.replace(day=1))
        .first()
    )
    return Decimal(str(row.mrr)) if row else ZERO


def _compute_monthly_churn(
    db: Session,
    snapshot_id: UUID,
    month: date,
    product_type: Optional[str],
    account_name: Optional[str],
    product_types: Optional[str] = None,
    month_from: Optional[date] = None,
    mode: str = "from_start",
) -> MonthlyChurnResponse:
    month = month.replace(day=1)
    previous_month = month_from.replace(day=1) if month_from else _add_months(month, -1)
    previous = _get_arr_by_account_bl(db, snapshot_id, previous_month, product_type, account_name, product_types, mode)
    current = _get_arr_by_account_bl(db, snapshot_id, month, product_type, account_name, product_types, mode)
    salesforce_previous = dict(previous)

    previous_online_arr = _get_author_online_arr(db, snapshot_id, previous_month, product_type, account_name, product_types)
    current_online_arr = _get_author_online_arr(db, snapshot_id, month, product_type, account_name, product_types)
    if previous_online_arr or current_online_arr:
        previous[ONLINE_KEY] = previous_online_arr
        current[ONLINE_KEY] = current_online_arr

    churn_arr = ZERO
    down_selling_arr = ZERO
    up_selling_arr = ZERO
    new_logo_arr = ZERO
    churned_logos = 0
    items: list[MonthlyChurnItem] = []

    for key in sorted(set(previous.keys()) | set(current.keys())):
        previous_arr = previous.get(key, ZERO)
        current_arr = current.get(key, ZERO)
        if previous_arr == ZERO and current_arr == ZERO:
            continue

        movement_type: str | None = None
        delta = current_arr - previous_arr

        if key == ONLINE_KEY:
            if current_arr > previous_arr:
                movement_type = "up_selling"
                up_selling_arr += current_arr - previous_arr
            elif current_arr < previous_arr:
                movement_type = "down_selling"
                down_selling_arr += previous_arr - current_arr
        elif previous_arr == ZERO and current_arr > ZERO:
            movement_type = "new_logo"
            new_logo_arr += current_arr
        elif previous_arr > ZERO and current_arr == ZERO:
            movement_type = "churn"
            churn_arr += previous_arr
            churned_logos += 1
        elif previous_arr > ZERO and current_arr < previous_arr:
            movement_type = "down_selling"
            down_selling_arr += previous_arr - current_arr
        elif previous_arr > ZERO and current_arr > previous_arr:
            movement_type = "up_selling"
            up_selling_arr += current_arr - previous_arr

        if movement_type:
            items.append(
                MonthlyChurnItem(
                    account_name=key[0],
                    product_type=key[1],
                    arr_previous=previous_arr,
                    arr_current=current_arr,
                    delta=delta,
                    movement_type=movement_type,
                )
            )

    arr_start = sum(previous.values(), ZERO)
    arr_end_existing = sum((current.get(key, ZERO) for key in previous), ZERO)
    net_existing_change = up_selling_arr - churn_arr - down_selling_arr
    total_logos_start = len([value for value in salesforce_previous.values() if value > ZERO])

    if arr_start:
        gross_arr_churn_rate = float(churn_arr / arr_start * 100)
        down_selling_rate = float(down_selling_arr / arr_start * 100)
        up_selling_rate = float(up_selling_arr / arr_start * 100)
        net_arr_churn_rate = float((churn_arr + down_selling_arr - up_selling_arr) / arr_start * 100)
        grr = float((arr_start - churn_arr - down_selling_arr) / arr_start * 100)
        nrr = float((arr_start - churn_arr - down_selling_arr + up_selling_arr) / arr_start * 100)
        logo_churn_rate = float(Decimal(churned_logos) / Decimal(total_logos_start) * 100) if total_logos_start else 0.0
    else:
        gross_arr_churn_rate = down_selling_rate = up_selling_rate = net_arr_churn_rate = 0.0
        grr = nrr = logo_churn_rate = 0.0

    items.sort(key=lambda item: abs(item.delta), reverse=True)
    return MonthlyChurnResponse(
        month=month,
        previous_month=previous_month,
        arr_start=arr_start,
        arr_end_existing=arr_end_existing,
        new_logo_arr=new_logo_arr,
        churn_arr=churn_arr,
        down_selling_arr=down_selling_arr,
        up_selling_arr=up_selling_arr,
        net_existing_change=net_existing_change,
        gross_arr_churn_rate=gross_arr_churn_rate,
        down_selling_rate=down_selling_rate,
        up_selling_rate=up_selling_rate,
        net_arr_churn_rate=net_arr_churn_rate,
        grr=min(grr, 100.0),
        nrr=nrr,
        logo_churn_rate=logo_churn_rate,
        churned_logos=churned_logos,
        total_logos_start=total_logos_start,
        items=items,
    )


def _monthly_summary(response: MonthlyChurnResponse) -> MonthlyChurnSummary:
    return MonthlyChurnSummary(
        month=response.month,
        previous_month=response.previous_month,
        arr_start=response.arr_start,
        arr_end_existing=response.arr_end_existing,
        new_logo_arr=response.new_logo_arr,
        churn_arr=response.churn_arr,
        down_selling_arr=response.down_selling_arr,
        up_selling_arr=response.up_selling_arr,
        net_existing_change=response.net_existing_change,
        gross_arr_churn_rate=response.gross_arr_churn_rate,
        down_selling_rate=response.down_selling_rate,
        up_selling_rate=response.up_selling_rate,
        net_arr_churn_rate=response.net_arr_churn_rate,
        grr=response.grr,
        nrr=response.nrr,
        logo_churn_rate=response.logo_churn_rate,
        churned_logos=response.churned_logos,
        total_logos_start=response.total_logos_start,
    )


@router.get("/monthly", response_model=MonthlyChurnResponse)
def churn_monthly(
    month: date = Query(...),
    month_from: Optional[date] = Query(None, description="Primer dia del periodo de partida"),
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    mode: str = Query("from_start", description="from_start | from_close"),
    db: Session = Depends(get_db),
):
    if mode not in {"from_start", "from_close"}:
        raise HTTPException(status_code=400, detail="mode debe ser from_start o from_close")
    snapshot = _snapshot_or_404(db, snapshot_id)
    return _compute_monthly_churn(db, snapshot.id, month, product_type, account_name, product_types, month_from, mode)


@router.get("/monthly-trend", response_model=MonthlyChurnTrendResponse)
def churn_monthly_trend(
    month_from: date = Query(...),
    month_to: date = Query(...),
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    mode: str = Query("from_start", description="from_start | from_close"),
    db: Session = Depends(get_db),
):
    if mode not in {"from_start", "from_close"}:
        raise HTTPException(status_code=400, detail="mode debe ser from_start o from_close")
    snapshot = _snapshot_or_404(db, snapshot_id)
    points = [
        _monthly_summary(_compute_monthly_churn(db, snapshot.id, month, product_type, account_name, product_types, None, mode))
        for month in _month_range(month_from, month_to)
    ]
    return MonthlyChurnTrendResponse(data=points)


@router.get("/ratios", response_model=ChurnRatiosResponse)
def churn_ratios(
    month_b: date = Query(...),
    window: Window = Query("ltm"),
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snapshot = _snapshot_or_404(db, snapshot_id)
    month_b = month_b.replace(day=1)
    month_a = _month_a(month_b, window)
    metrics = _compute_ratios(db, snapshot.id, month_a, month_b, product_type, account_name, product_types)
    return ChurnRatiosResponse(window=window, month_a=month_a, month_b=month_b, **metrics)


@router.get("/rolling", response_model=ChurnRollingResponse)
def churn_rolling(
    month_to: date = Query(...),
    window: Window = Query("ltm"),
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snapshot = _snapshot_or_404(db, snapshot_id)
    first_month, last_month = _data_bounds(db, snapshot.id)
    month_to = month_to.replace(day=1)
    if not first_month or not last_month:
        return ChurnRollingResponse(data=[], window=window)

    last_point = min(month_to, last_month.replace(day=1))
    points: list[ChurnRollingPoint] = []
    for month in _month_range(first_month, last_point):
        month_a = _month_a(month, window)
        if month_a < first_month:
            continue
        metrics = _compute_ratios(db, snapshot.id, month_a, month, product_type, account_name, product_types)
        if metrics["total_logos"] == 0:
            continue
        points.append(
            ChurnRollingPoint(
                month=month,
                nrr=metrics["nrr"],
                grr=metrics["grr"],
                churned_arr=metrics["churned_arr"],
                churned_logos=metrics["churned_logos"],
            )
        )
    return ChurnRollingResponse(data=points, window=window)


@router.get("/churned-accounts", response_model=ChurnedAccountsResponse)
def churned_accounts(
    month_b: date = Query(...),
    window: Window = Query("ltm"),
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snapshot = _snapshot_or_404(db, snapshot_id)
    month_b = month_b.replace(day=1)
    month_a = _month_a(month_b, window)
    metrics = _compute_ratios(db, snapshot.id, month_a, month_b, product_type, account_name, product_types)
    items: list[ChurnedAccount] = []
    active_cache: dict[date, dict] = {}

    for key, arr_lost in metrics["cohort"].items():
        if metrics["arr_b"].get(key, ZERO) != ZERO:
            continue
        churn_month = month_b
        for month in _month_range(_add_months(month_a, 1), month_b):
            active_cache.setdefault(
                month,
                _get_arr_by_account_bl(db, snapshot.id, month, product_type, account_name, product_types),
            )
            if active_cache[month].get(key, ZERO) == ZERO:
                churn_month = month
                break
        items.append(
            ChurnedAccount(
                account_name=key[0],
                product_type=key[1],
                churn_month=churn_month,
                arr_lost=arr_lost,
            )
        )

    items.sort(key=lambda item: item.arr_lost, reverse=True)
    return ChurnedAccountsResponse(
        items=items,
        total_arr_lost=sum((item.arr_lost for item in items), ZERO),
        count=len(items),
    )


@router.get("/by-product-type", response_model=ChurnByProductTypeResponse)
def churn_by_product_type(
    month_from: date = Query(...),
    month_to: date = Query(...),
    snapshot_id: Optional[UUID] = Query(None),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    snapshot = _snapshot_or_404(db, snapshot_id)
    points: list[ChurnByProductTypePoint] = []
    for month in _month_range(month_from, month_to):
        previous = _get_arr_by_account_bl(
            db, snapshot.id, _add_months(month, -1), product_type, account_name, product_types
        )
        current = _get_arr_by_account_bl(db, snapshot.id, month, product_type, account_name, product_types)
        by_type: dict[str, Decimal] = {}
        for (account, item_type), amount in previous.items():
            if amount > ZERO and current.get((account, item_type), ZERO) == ZERO:
                by_type[item_type] = by_type.get(item_type, ZERO) + amount
        points.append(
            ChurnByProductTypePoint(
                month=month.replace(day=1),
                by_product_type=by_type,
                total_churned_arr=sum(by_type.values(), ZERO),
            )
        )
    return ChurnByProductTypeResponse(data=points)

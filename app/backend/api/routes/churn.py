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
)
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, Snapshot

router = APIRouter()

Window = Literal["ltm", "ytd"]
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

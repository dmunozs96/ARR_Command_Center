"""GET /api/gagero/bridge — ARR waterfall bridge analysis."""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.backend.api.routes.arr import _active_start_month
from app.backend.api.schemas import BridgeCategory, BridgeItem, BridgeResponse
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot

router = APIRouter()


def _get_arr_by_account_bl(
    db: Session,
    snapshot_id: UUID,
    month: date,
    product_type: Optional[str],
    account_name: Optional[str],
    product_types: Optional[str] = None,
    mode: str = "from_start",
) -> dict:
    product_type_list = [value.strip() for value in product_types.split(",") if value.strip()] if product_types else []
    query = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(ARRLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.end_month_normalized >= month,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
    )
    if product_type:
        query = query.filter(ARRLineItem.product_type == product_type)
    if product_type_list:
        query = query.filter(ARRLineItem.product_type.in_(product_type_list))
    if account_name:
        query = query.filter(RawOpportunityLineItem.account_name == account_name)

    totals: dict[tuple[str, str], Decimal] = {}
    for arr, raw in query.all():
        active_start = _active_start_month(arr, raw, mode)
        if active_start > month:
            continue
        key = (raw.account_name or "Sin cuenta", arr.product_type)
        totals[key] = totals.get(key, Decimal("0")) + Decimal(str(arr.annualized_value))

    return totals


def _classify_bridge(arr_a: dict, arr_b: dict) -> dict:
    all_keys = set(arr_a.keys()) | set(arr_b.keys())
    zero = Decimal(0)

    new_logo: list[BridgeItem] = []
    churn: list[BridgeItem] = []
    up_selling: list[BridgeItem] = []
    down_selling: list[BridgeItem] = []
    unchanged_count = 0

    for key in all_keys:
        a = arr_a.get(key, zero)
        b = arr_b.get(key, zero)
        account, product_type = key
        delta = b - a

        item = BridgeItem(
            account_name=account,
            product_type=product_type,
            arr_a=a,
            arr_b=b,
            delta=delta,
        )

        if a == zero and b > zero:
            new_logo.append(item)
        elif a > zero and b == zero:
            churn.append(item)
        elif a > zero and b > a:
            up_selling.append(item)
        elif a > zero and b < a:
            down_selling.append(item)
        else:
            unchanged_count += 1

    new_logo.sort(key=lambda x: abs(x.delta), reverse=True)
    churn.sort(key=lambda x: abs(x.delta), reverse=True)
    up_selling.sort(key=lambda x: abs(x.delta), reverse=True)
    down_selling.sort(key=lambda x: abs(x.delta), reverse=True)

    return {
        "new_logo": new_logo,
        "churn": churn,
        "up_selling": up_selling,
        "down_selling": down_selling,
        "unchanged_count": unchanged_count,
    }


@router.get("/bridge", response_model=BridgeResponse)
def get_bridge(
    month_a: date = Query(..., description="Primer día del mes A (YYYY-MM-DD)"),
    month_b: date = Query(..., description="Primer día del mes B (YYYY-MM-DD)"),
    snapshot_id: Optional[UUID] = Query(None, description="UUID del snapshot (por defecto: el más reciente)"),
    product_type: Optional[str] = Query(None),
    product_types: Optional[str] = Query(None, description="Lista CSV de lineas de negocio"),
    account_name: Optional[str] = Query(None),
    mode: str = Query("from_start", description="from_start | from_close"),
    db: Session = Depends(get_db),
):
    if mode not in {"from_start", "from_close"}:
        raise HTTPException(status_code=400, detail="mode debe ser from_start o from_close")

    if snapshot_id:
        snap = db.query(Snapshot).filter(Snapshot.id == snapshot_id, Snapshot.status == "completed").first()
    else:
        snap = db.query(Snapshot).filter(Snapshot.status == "completed").order_by(Snapshot.created_at.desc()).first()

    if not snap:
        raise HTTPException(status_code=404, detail="No hay snapshots disponibles")

    month_a = month_a.replace(day=1)
    month_b = month_b.replace(day=1)

    arr_a = _get_arr_by_account_bl(db, snap.id, month_a, product_type, account_name, product_types, mode)
    arr_b = _get_arr_by_account_bl(db, snap.id, month_b, product_type, account_name, product_types, mode)

    classified = _classify_bridge(arr_a, arr_b)

    zero = Decimal(0)
    total_a = sum(arr_a.values(), zero)
    total_b = sum(arr_b.values(), zero)
    net_change = total_b - total_a
    net_change_pct = float(net_change / total_a) if total_a else 0.0

    new_logo_delta = sum((item.delta for item in classified["new_logo"]), zero)
    churn_delta = sum((item.delta for item in classified["churn"]), zero)
    up_selling_delta = sum((item.delta for item in classified["up_selling"]), zero)
    down_selling_delta = sum((item.delta for item in classified["down_selling"]), zero)

    return BridgeResponse(
        snapshot_id=snap.id,
        month_a=month_a,
        month_b=month_b,
        arr_a=total_a,
        arr_b=total_b,
        net_change=net_change,
        net_change_pct=net_change_pct,
        new_logo=BridgeCategory(
            total_delta=new_logo_delta,
            count=len(classified["new_logo"]),
            items=classified["new_logo"],
        ),
        churn=BridgeCategory(
            total_delta=churn_delta,
            count=len(classified["churn"]),
            items=classified["churn"],
        ),
        up_selling=BridgeCategory(
            total_delta=up_selling_delta,
            count=len(classified["up_selling"]),
            items=classified["up_selling"],
        ),
        down_selling=BridgeCategory(
            total_delta=down_selling_delta,
            count=len(classified["down_selling"]),
            items=classified["down_selling"],
        ),
        unchanged_count=classified["unchanged_count"],
    )

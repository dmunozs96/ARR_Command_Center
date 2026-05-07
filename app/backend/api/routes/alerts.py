"""
Alerts routes:
  GET   /api/alerts?snapshot_id=&reviewed=false
  PATCH /api/alerts/{id}
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.backend.api.schemas import AlertOut, AlertPatch
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot, SnapshotAlert

router = APIRouter()


def _latest_snapshot_id(db: Session) -> Optional[UUID]:
    snap = (
        db.query(Snapshot)
        .filter(Snapshot.status == "completed")
        .order_by(Snapshot.created_at.desc())
        .first()
    )
    return snap.id if snap else None


def _build_arr_impact_map(
    alerts: List[SnapshotAlert],
    snapshot_id: UUID,
    db: Session,
) -> Dict[UUID, Decimal]:
    """Return {alert.id: arr_impact} for alerts that have a computable ARR impact."""
    impact: Dict[UUID, Decimal] = {}

    # Case 1: alerts with a direct arr_line_item_id link (OVERLAPPING_CONTRACTS)
    linked_ids = [a.arr_line_item_id for a in alerts if a.arr_line_item_id]
    if linked_ids:
        rows = (
            db.query(ARRLineItem.id, ARRLineItem.annualized_value)
            .filter(ARRLineItem.id.in_(linked_ids))
            .all()
        )
        item_value: Dict[UUID, Decimal] = {r.id: Decimal(str(r.annualized_value)) for r in rows}
        for a in alerts:
            if a.arr_line_item_id and a.arr_line_item_id in item_value:
                impact[a.id] = item_value[a.arr_line_item_id]

    # Case 2: UNCLASSIFIED_PRODUCT – sum annualized_value by (sf_opp_id, product_name)
    unclassified = [
        a for a in alerts
        if a.alert_type == "UNCLASSIFIED_PRODUCT" and a.sf_opportunity_id and a.product_name
    ]
    if unclassified:
        raw_rows = (
            db.query(
                ARRLineItem.annualized_value,
                RawOpportunityLineItem.sf_opportunity_id,
                RawOpportunityLineItem.product_name,
            )
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(ARRLineItem.snapshot_id == snapshot_id)
            .all()
        )
        totals: Dict[Tuple[str, str], Decimal] = {}
        for val, opp_id, prod_name in raw_rows:
            key = (opp_id or "", prod_name or "")
            totals[key] = totals.get(key, Decimal("0")) + Decimal(str(val))

        for a in unclassified:
            key = (a.sf_opportunity_id or "", a.product_name or "")
            if key in totals:
                impact[a.id] = totals[key]

    return impact


def _alert_to_out(alert: SnapshotAlert, arr_impact: Optional[Decimal] = None) -> AlertOut:
    return AlertOut(
        id=alert.id,
        snapshot_id=alert.snapshot_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        sf_opportunity_id=alert.sf_opportunity_id,
        opportunity_name=alert.opportunity_name,
        account_name=alert.account_name,
        product_name=alert.product_name,
        description=alert.description,
        reviewed=alert.reviewed,
        review_note=alert.review_note,
        reviewed_at=alert.reviewed_at,
        reviewed_by=alert.reviewed_by,
        arr_line_item_id=alert.arr_line_item_id,
        created_at=alert.created_at,
        arr_impact=arr_impact,
    )


@router.get("", response_model=List[AlertOut])
def list_alerts(
    snapshot_id: Optional[UUID] = Query(None),
    reviewed: Optional[bool] = Query(None),
    alert_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sid = snapshot_id or _latest_snapshot_id(db)
    if not sid:
        return []

    q = db.query(SnapshotAlert).filter(SnapshotAlert.snapshot_id == sid)
    if reviewed is not None:
        q = q.filter(SnapshotAlert.reviewed == reviewed)
    if alert_type:
        q = q.filter(SnapshotAlert.alert_type == alert_type)

    alerts = q.order_by(SnapshotAlert.severity, SnapshotAlert.created_at).all()
    impact_map = _build_arr_impact_map(alerts, sid, db)
    return [_alert_to_out(a, impact_map.get(a.id)) for a in alerts]


@router.patch("/{alert_id}", response_model=AlertOut)
def patch_alert(alert_id: UUID, body: AlertPatch, db: Session = Depends(get_db)):
    alert = db.query(SnapshotAlert).filter(SnapshotAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.reviewed = body.reviewed
    if body.review_note is not None:
        alert.review_note = body.review_note
    if body.reviewed_by is not None:
        alert.reviewed_by = body.reviewed_by
    if body.reviewed:
        alert.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)
    impact_map = _build_arr_impact_map([alert], alert.snapshot_id, db)
    return _alert_to_out(alert, impact_map.get(alert.id))

"""
Alerts routes:
  GET   /api/alerts?snapshot_id=&reviewed=false
  PATCH /api/alerts/bulk-review
  PATCH /api/alerts/{id}
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.backend.api.routes.arr import _latest_snapshot_id_or_none
from app.backend.api.schemas import AlertOut, AlertPatch, BulkAlertPatch
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, SnapshotAlert

router = APIRouter()


def _group_key(alert: SnapshotAlert) -> str:
    """Derive a stable grouping key for an alert based on its root cause."""
    if alert.alert_type == "MISSING_COUNTRY":
        # description = "Consultor 'X' no tiene país asignado." — unique per consultant
        return f"MISSING_COUNTRY::{alert.description}"
    if alert.alert_type == "UNCLASSIFIED_PRODUCT":
        return f"UNCLASSIFIED_PRODUCT::{(alert.product_name or '').strip()}"
    # All other types are per-opportunity — no dedup
    return str(alert.id)


def _build_grouped_impact(
    groups: Dict[str, List[SnapshotAlert]],
    snapshot_id: UUID,
    db: Session,
) -> Dict[str, Decimal]:
    """Return {group_key: total_arr_impact} for alerts that have a computable ARR impact."""
    impact: Dict[str, Decimal] = {}

    # OVERLAPPING_CONTRACTS: direct arr_line_item_id link (each is its own group)
    for key, group in groups.items():
        rep = group[0]
        if rep.alert_type == "OVERLAPPING_CONTRACTS" and rep.arr_line_item_id:
            row = (
                db.query(ARRLineItem.annualized_value)
                .filter(ARRLineItem.id == rep.arr_line_item_id)
                .first()
            )
            if row:
                impact[key] = Decimal(str(row.annualized_value))

    # UNCLASSIFIED_PRODUCT: sum ARR for all line items with this product_name across all opps
    unclassified = {k: v for k, v in groups.items() if v[0].alert_type == "UNCLASSIFIED_PRODUCT"}
    if unclassified:
        raw_rows = (
            db.query(ARRLineItem.annualized_value, RawOpportunityLineItem.product_name)
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(ARRLineItem.snapshot_id == snapshot_id)
            .all()
        )
        by_product: Dict[str, Decimal] = {}
        for val, prod_name in raw_rows:
            k = (prod_name or "").strip()
            by_product[k] = by_product.get(k, Decimal("0")) + Decimal(str(val))

        for key, group in unclassified.items():
            prod_name = (group[0].product_name or "").strip()
            if prod_name in by_product:
                impact[key] = by_product[prod_name]

    # MISSING_COUNTRY: sum ARR for all opportunities in the group (= consultant's total ARR exposure)
    missing = {k: v for k, v in groups.items() if v[0].alert_type == "MISSING_COUNTRY"}
    if missing:
        for key, group in missing.items():
            opp_ids = [a.sf_opportunity_id for a in group if a.sf_opportunity_id]
            if not opp_ids:
                continue
            rows = (
                db.query(ARRLineItem.annualized_value)
                .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
                .filter(ARRLineItem.snapshot_id == snapshot_id)
                .filter(RawOpportunityLineItem.sf_opportunity_id.in_(opp_ids))
                .all()
            )
            total = sum(Decimal(str(r.annualized_value)) for r in rows)
            if total > 0:
                impact[key] = total

    return impact


def _build_grouped_alerts(alerts: List[SnapshotAlert], snapshot_id: UUID, db: Session) -> List[AlertOut]:
    # Group by root cause
    groups: Dict[str, List[SnapshotAlert]] = {}
    for alert in alerts:
        key = _group_key(alert)
        groups.setdefault(key, []).append(alert)

    impact_map = _build_grouped_impact(groups, snapshot_id, db)

    result = []
    for key, group in groups.items():
        rep = group[0]
        reviewed_count = sum(1 for a in group if a.reviewed)
        result.append(AlertOut(
            id=rep.id,
            snapshot_id=rep.snapshot_id,
            alert_type=rep.alert_type,
            severity=rep.severity,
            sf_opportunity_id=rep.sf_opportunity_id,
            opportunity_name=rep.opportunity_name,
            account_name=rep.account_name,
            product_name=rep.product_name,
            description=rep.description,
            reviewed=reviewed_count == len(group),
            review_note=rep.review_note,
            reviewed_at=rep.reviewed_at,
            reviewed_by=rep.reviewed_by,
            arr_line_item_id=rep.arr_line_item_id,
            created_at=rep.created_at,
            arr_impact=impact_map.get(key),
            occurrence_count=len(group),
            alert_ids=[str(a.id) for a in group],
            reviewed_count=reviewed_count,
        ))

    severity_order = {"ERROR": 0, "WARNING": 1, "INFO": 2}
    result.sort(key=lambda x: (severity_order.get(x.severity.upper(), 3), -x.occurrence_count))
    return result


@router.get("", response_model=List[AlertOut])
def list_alerts(
    snapshot_id: Optional[UUID] = Query(None),
    reviewed: Optional[bool] = Query(None),
    alert_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sid = snapshot_id or _latest_snapshot_id_or_none(db)
    if not sid:
        return []

    q = db.query(SnapshotAlert).filter(SnapshotAlert.snapshot_id == sid)
    if reviewed is not None:
        q = q.filter(SnapshotAlert.reviewed == reviewed)
    if alert_type:
        q = q.filter(SnapshotAlert.alert_type == alert_type)

    # Suppress DURATION_ANOMALY_HIGH — always noise, contracts >2 years are normal
    q = q.filter(SnapshotAlert.alert_type != "DURATION_ANOMALY_HIGH")

    alerts = q.order_by(SnapshotAlert.severity, SnapshotAlert.created_at).all()

    # Suppress HIGH_ARR_FLAG for non-SaaS products (they don't affect ARR)
    # Build set of sf_opportunity_ids that have at least one SaaS line item
    saas_opp_rows = (
        db.query(RawOpportunityLineItem.sf_opportunity_id)
        .join(ARRLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == sid, ARRLineItem.is_saas == True)
        .distinct()
        .all()
    )
    saas_opp_ids = {row[0] for row in saas_opp_rows}

    alerts = [
        a for a in alerts
        if a.alert_type != "HIGH_ARR_FLAG" or a.sf_opportunity_id in saas_opp_ids
    ]

    return _build_grouped_alerts(alerts, sid, db)


@router.patch("/bulk-review", response_model=List[AlertOut])
def bulk_review_alerts(body: BulkAlertPatch, db: Session = Depends(get_db)):
    """Mark a batch of alerts (all in a group) as reviewed in one call."""
    alerts = (
        db.query(SnapshotAlert)
        .filter(SnapshotAlert.id.in_(body.alert_ids))
        .all()
    )
    if not alerts:
        raise HTTPException(status_code=404, detail="No alerts found for given IDs")

    for alert in alerts:
        alert.reviewed = body.reviewed
        if body.review_note is not None:
            alert.review_note = body.review_note
        if body.reviewed_by is not None:
            alert.reviewed_by = body.reviewed_by
        if body.reviewed:
            alert.reviewed_at = datetime.utcnow()

    db.commit()
    for alert in alerts:
        db.refresh(alert)

    snapshot_id = alerts[0].snapshot_id
    return _build_grouped_alerts(alerts, snapshot_id, db)


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

    groups = {_group_key(alert): [alert]}
    impact_map = _build_grouped_impact(groups, alert.snapshot_id, db)
    key = _group_key(alert)
    reviewed_count = 1 if alert.reviewed else 0
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
        arr_impact=impact_map.get(key),
        occurrence_count=1,
        alert_ids=[str(alert.id)],
        reviewed_count=reviewed_count,
    )

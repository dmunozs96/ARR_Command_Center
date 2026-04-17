"""
Alerts routes:
  GET   /api/alerts?snapshot_id=&reviewed=false
  PATCH /api/alerts/{id}
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.backend.api.schemas import AlertOut, AlertPatch
from app.backend.db.connection import get_db
from app.backend.db.models import Snapshot, SnapshotAlert

router = APIRouter()


def _latest_snapshot_id(db: Session) -> Optional[UUID]:
    snap = (
        db.query(Snapshot)
        .filter(Snapshot.status == "completed")
        .order_by(Snapshot.created_at.desc())
        .first()
    )
    return snap.id if snap else None


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

    return q.order_by(SnapshotAlert.severity, SnapshotAlert.created_at).all()


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
    return alert

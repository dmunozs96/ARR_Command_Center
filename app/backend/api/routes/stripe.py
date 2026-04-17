"""
Stripe MRR routes:
  GET /api/stripe-mrr?snapshot_id=
  PUT /api/stripe-mrr
"""

from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.backend.api.schemas import StripeMRROut, StripeMRRUpsert
from app.backend.db.connection import get_db
from app.backend.db.models import Snapshot, SnapshotStripeMRR

router = APIRouter()


def _latest_snapshot_id(db: Session) -> Optional[UUID]:
    snap = (
        db.query(Snapshot)
        .filter(Snapshot.status == "completed")
        .order_by(Snapshot.created_at.desc())
        .first()
    )
    return snap.id if snap else None


@router.get("", response_model=List[StripeMRROut])
def get_stripe_mrr(
    snapshot_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
):
    sid = snapshot_id or _latest_snapshot_id(db)
    if not sid:
        return []
    rows = (
        db.query(SnapshotStripeMRR)
        .filter(SnapshotStripeMRR.snapshot_id == sid)
        .order_by(SnapshotStripeMRR.month)
        .all()
    )
    result = []
    for r in rows:
        result.append(
            StripeMRROut(
                month=r.month,
                mrr=Decimal(str(r.mrr)),
                arr_equivalent=Decimal(str(r.mrr)) * 12,
                entered_by=r.entered_by,
                entered_at=r.entered_at,
            )
        )
    return result


@router.put("", response_model=StripeMRROut, status_code=200)
def upsert_stripe_mrr(body: StripeMRRUpsert, db: Session = Depends(get_db)):
    existing = (
        db.query(SnapshotStripeMRR)
        .filter(
            SnapshotStripeMRR.snapshot_id == body.snapshot_id,
            SnapshotStripeMRR.month == body.month,
        )
        .first()
    )
    if existing:
        existing.mrr = body.mrr
        existing.entered_by = body.entered_by
    else:
        existing = SnapshotStripeMRR(
            snapshot_id=body.snapshot_id,
            month=body.month,
            mrr=body.mrr,
            entered_by=body.entered_by,
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return StripeMRROut(
        month=existing.month,
        mrr=Decimal(str(existing.mrr)),
        arr_equivalent=Decimal(str(existing.mrr)) * 12,
        entered_by=existing.entered_by,
        entered_at=existing.entered_at,
    )

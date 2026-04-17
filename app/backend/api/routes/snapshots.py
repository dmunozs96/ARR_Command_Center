"""GET /api/snapshots and GET /api/snapshots/{id}"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.backend.api.schemas import SnapshotDetail, SnapshotSummary
from app.backend.db.connection import get_db
from app.backend.db.models import Snapshot

router = APIRouter()


@router.get("", response_model=List[SnapshotSummary])
def list_snapshots(db: Session = Depends(get_db)):
    return db.query(Snapshot).order_by(Snapshot.created_at.desc()).all()


@router.get("/{snapshot_id}", response_model=SnapshotDetail)
def get_snapshot(snapshot_id: UUID, db: Session = Depends(get_db)):
    snap = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snap

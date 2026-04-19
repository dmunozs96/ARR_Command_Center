"""POST /api/sync - full Salesforce sync for Phase E."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.backend.api.schemas import SyncRequest, SyncResponse
from app.backend.core.sf_extractor import (
    SalesforceConfigurationError,
    SalesforceExtractor,
    SalesforceSyncError,
)
from app.backend.core.snapshot_manager import SnapshotManager
from app.backend.db.connection import get_db

router = APIRouter()


@router.post("", response_model=SyncResponse)
def trigger_sync(body: SyncRequest = SyncRequest(), db: Session = Depends(get_db)):
    extractor = SalesforceExtractor()

    try:
        raw_items = extractor.fetch_raw_line_items()
    except SalesforceConfigurationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SalesforceSyncError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    manager = SnapshotManager(db)
    snapshot = manager.create_snapshot(
        raw_items=raw_items,
        sync_type="salesforce_full",
        triggered_by=body.triggered_by or "api",
        notes=body.notes or "Full sync from Salesforce API",
    )

    return SyncResponse(
        snapshot_id=snapshot.id,
        status=snapshot.status,
        records_processed=snapshot.sf_records_processed,
        alerts_count=snapshot.alerts_count,
        duration_seconds=snapshot.duration_seconds,
    )

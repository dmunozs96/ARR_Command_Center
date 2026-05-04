"""POST /api/sync - full Salesforce sync."""

import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.backend.api.schemas import SyncRequest, SyncResponse
from app.backend.core.sf_extractor import (
    SalesforceConfigurationError,
    SalesforceExtractor,
    SalesforceSyncError,
)
from app.backend.core.snapshot_manager import SnapshotManager, compute_raw_hash
from app.backend.db.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


def _do_sync(body: SyncRequest, db: Session, force: bool = False) -> SyncResponse:
    extractor = SalesforceExtractor()

    try:
        raw_items = extractor.fetch_raw_line_items()
    except SalesforceConfigurationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SalesforceSyncError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    current_hash = compute_raw_hash(raw_items)
    manager = SnapshotManager(db)

    if not force:
        prev_hash = manager.latest_data_hash()
        if prev_hash == current_hash:
            logger.info("Daily sync: no changes detected (hash match), skipping snapshot creation.")
            return SyncResponse(
                status="skipped",
                skipped=True,
                skip_reason="SF data unchanged since last snapshot",
            )

    snapshot = manager.create_snapshot(
        raw_items=raw_items,
        sync_type="salesforce_full",
        triggered_by=body.triggered_by or "api",
        notes=body.notes or "Full sync from Salesforce API",
        data_hash=current_hash,
    )

    return SyncResponse(
        snapshot_id=snapshot.id,
        status=snapshot.status,
        records_processed=snapshot.sf_records_processed,
        alerts_count=snapshot.alerts_count,
        duration_seconds=snapshot.duration_seconds,
    )


@router.post("", response_model=SyncResponse)
def trigger_sync(body: SyncRequest = SyncRequest(), db: Session = Depends(get_db)):
    return _do_sync(body, db, force=False)


@router.post("/cron/daily", response_model=SyncResponse)
def cron_daily_sync(
    x_cron_secret: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Called by Railway cron daily. Protected by CRON_SECRET env var."""
    expected = os.getenv("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")

    return _do_sync(
        SyncRequest(triggered_by="cron", notes="Automatic daily sync"),
        db,
        force=False,
    )

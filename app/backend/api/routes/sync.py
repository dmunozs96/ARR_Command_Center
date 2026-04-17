"""
POST /api/sync

Phase B: mock implementation — copies raw line items from the latest
completed snapshot and creates a new snapshot from them. No Salesforce
connection yet (that comes in Phase E).
"""

from decimal import Decimal
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.backend.api.schemas import SyncRequest, SyncResponse
from app.backend.core.arr_calculator import RawLineItem
from app.backend.core.snapshot_manager import SnapshotManager
from app.backend.db.connection import get_db
from app.backend.db.models import RawOpportunityLineItem, Snapshot

router = APIRouter()


@router.post("", response_model=SyncResponse)
def trigger_sync(body: SyncRequest = SyncRequest(), db: Session = Depends(get_db)):
    # Find latest completed snapshot to seed mock data
    latest = (
        db.query(Snapshot)
        .filter(Snapshot.status == "completed")
        .order_by(Snapshot.created_at.desc())
        .first()
    )
    if not latest:
        raise HTTPException(
            status_code=404,
            detail="No completed snapshot found to mock from. Run import_excel_data.py first.",
        )

    # Load raw line items from that snapshot
    raw_rows = (
        db.query(RawOpportunityLineItem)
        .filter(RawOpportunityLineItem.snapshot_id == latest.id)
        .all()
    )

    raw_items = [
        RawLineItem(
            sf_opportunity_id=r.sf_opportunity_id,
            sf_line_item_id=r.sf_line_item_id,
            opportunity_name=r.opportunity_name or "",
            account_name=r.account_name or "",
            opportunity_owner=r.opportunity_owner or "",
            opportunity_type=r.opportunity_type or "",
            channel_type=r.channel_type or "unknown",
            close_date=r.close_date,
            product_name=r.product_name,
            unit_price=Decimal(str(r.unit_price)),
            quantity=Decimal(str(r.quantity)),
            subscription_start_date=r.subscription_start_date,
            subscription_end_date=r.subscription_end_date,
            licence_period_months=r.licence_period_months,
            business_line=r.business_line,
            opportunity_amount=Decimal(str(r.opportunity_amount)) if r.opportunity_amount else None,
            product_code=r.product_code,
        )
        for r in raw_rows
    ]

    manager = SnapshotManager(db)
    snapshot = manager.create_snapshot(
        raw_items=raw_items,
        sync_type="mock_sf",
        triggered_by=body.triggered_by or "api",
        notes=body.notes or "Mock sync from latest snapshot data",
    )

    return SyncResponse(
        snapshot_id=snapshot.id,
        status=snapshot.status,
        records_processed=snapshot.sf_records_processed,
        alerts_count=snapshot.alerts_count,
        duration_seconds=snapshot.duration_seconds,
    )

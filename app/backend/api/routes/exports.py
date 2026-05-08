"""GET /api/exports/excel?snapshot_id={uuid}"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from sqlalchemy.orm import Session

from app.backend.core.excel_exporter import build_snapshot_excel
from app.backend.db.connection import get_db
from app.backend.db.models import Snapshot

router = APIRouter()


@router.get("/excel")
def export_snapshot_excel(
    snapshot_id: UUID = Query(..., description="UUID del snapshot a exportar"),
    db: Session = Depends(get_db),
):
    snap = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot no encontrado")

    try:
        xlsx_bytes = build_snapshot_excel(snapshot_id, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {exc}") from exc

    filename = f"arr-snapshot-{snap.created_at.strftime('%Y-%m-%d')}.xlsx"
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

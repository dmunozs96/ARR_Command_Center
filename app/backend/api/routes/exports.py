"""GET /api/exports/excel?snapshot_id={uuid}"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from sqlalchemy.orm import Session

from app.backend.core.excel_exporter import build_snapshot_excel
from app.backend.db.connection import get_db
from app.backend.db.models import Snapshot

router = APIRouter()


@router.get("/excel")
def export_snapshot_excel(
    snapshot_id: UUID = Query(..., description="UUID del snapshot a exportar"),
    gagero_month_a: Optional[date] = Query(None, description="Mes A para pestaña Gagero (YYYY-MM-DD)"),
    gagero_month_b: Optional[date] = Query(None, description="Mes B para pestaña Gagero (YYYY-MM-DD)"),
    gagero_mode: str = Query("from_start", description="from_start | from_close"),
    db: Session = Depends(get_db),
):
    snap = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot no encontrado")

    try:
        xlsx_bytes = build_snapshot_excel(snapshot_id, db, gagero_month_a, gagero_month_b, gagero_mode)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {exc}") from exc

    filename = f"arr-snapshot-{snap.created_at.strftime('%Y-%m-%d')}.xlsx"
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return Response(
        content=xlsx_bytes,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(xlsx_bytes)),
        },
    )

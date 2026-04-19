"""POST /api/imports/excel - manual Excel upload fallback."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.backend.api.schemas import SyncResponse
from app.backend.core.excel_importer import ExcelImportError, import_excel_bytes
from app.backend.db.connection import get_db

router = APIRouter()


@router.post("/excel", response_model=SyncResponse)
async def upload_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = file.filename or "upload.xlsx"
    suffix = Path(filename).suffix.lower()
    if suffix != ".xlsx":
        raise HTTPException(status_code=400, detail="Solo se admiten ficheros .xlsx.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="El fichero subido esta vacio.")

    try:
        summary = import_excel_bytes(
            db,
            file_bytes,
            triggered_by="ui_excel_upload",
            notes=f"Importado manualmente desde {filename}",
        )
    except ExcelImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    snapshot = summary.snapshot
    return SyncResponse(
        snapshot_id=snapshot.id,
        status=snapshot.status,
        records_processed=snapshot.sf_records_processed,
        alerts_count=snapshot.alerts_count,
        duration_seconds=snapshot.duration_seconds,
    )

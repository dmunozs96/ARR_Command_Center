"""POST /api/imports/excel  - manual BBDD snapshot upload
   POST /api/imports/masters - load product + consultant masters from Excel
"""

from io import BytesIO
from pathlib import Path

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.backend.api.schemas import MastersImportResponse, SyncResponse
from app.backend.core.excel_importer import (
    ExcelImportError,
    import_excel_bytes,
    load_consultant_countries,
    load_product_classifications,
    upsert_consultant_countries,
    upsert_product_classifications,
)
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


@router.post("/masters", response_model=MastersImportResponse)
async def upload_masters(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Load product classifications and consultant-country mappings from an Excel
    that contains the sheets 'Productos SF SAAS' and/or 'País Consultor'.
    Existing rows are updated; new rows are created.
    """
    filename = file.filename or "upload.xlsx"
    if Path(filename).suffix.lower() != ".xlsx":
        raise HTTPException(status_code=400, detail="Solo se admiten ficheros .xlsx.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="El fichero subido esta vacio.")

    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="No se pudo abrir el fichero Excel.") from exc

    try:
        products = load_product_classifications(wb)
        countries = load_consultant_countries(wb)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Error al leer las hojas maestras: {exc}") from exc

    if not products and not countries:
        raise HTTPException(
            status_code=422,
            detail=(
                "El fichero no contiene hojas maestras. "
                "Se esperan 'Productos SF SAAS' y/o 'Pais Consultor'."
            ),
        )

    # Compound keys (name|business_line) are for in-memory lookup only — skip them
    plain_products = {k: v for k, v in products.items() if "|" not in k}

    try:
        upsert_product_classifications(db, products)
        upsert_consultant_countries(db, countries)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar los maestros en BBDD: {exc}") from exc

    return MastersImportResponse(
        products_loaded=len(plain_products),
        consultants_loaded=len(countries),
    )

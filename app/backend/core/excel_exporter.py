"""
Builds an xlsx export for a snapshot with 5 sheets:
  1. Resumen mensual
  2. Por cliente
  3. Por consultor
  4. Por pais
  5. Lineas brutas
"""

import io
from datetime import date
from uuid import UUID

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session

from app.backend.db.models import ARRLineItem, ARRMonthlySummary, ConsultantCountry, RawOpportunityLineItem, Snapshot


_HEADER_FILL = PatternFill(start_color="2F185F", end_color="2F185F", fill_type="solid")
_HEADER_FONT = Font(color="FFFFFF", bold=True, size=10)
_HEADER_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _write_headers(ws, headers: list[str]) -> None:
    ws.append(headers)
    for col, _ in enumerate(headers, start=1):
        cell = ws.cell(row=ws.max_row, column=col)
        cell.fill = _HEADER_FILL
        cell.font = _HEADER_FONT
        cell.alignment = _HEADER_ALIGN
    ws.row_dimensions[ws.max_row].height = 22


def _autofit(ws) -> None:
    for col in ws.columns:
        max_len = max(
            (len(str(cell.value)) if cell.value is not None else 0) for cell in col
        )
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 4, 40)


def build_snapshot_excel(snapshot_id: UUID, db: Session) -> bytes:
    snap = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
    if not snap:
        raise ValueError(f"Snapshot {snapshot_id} not found")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # remove default sheet

    _sheet_resumen(wb, snapshot_id, db)
    _sheet_por_cliente(wb, snapshot_id, db)
    _sheet_por_consultor(wb, snapshot_id, db)
    _sheet_por_pais(wb, snapshot_id, db)
    _sheet_lineas_brutas(wb, snapshot_id, db)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


# ── Sheet 1: Resumen mensual ──────────────────────────────────────────────────

def _sheet_resumen(wb, snapshot_id: UUID, db: Session) -> None:
    ws = wb.create_sheet("Resumen mensual")
    _write_headers(ws, ["Mes", "Tipo de producto", "ARR (EUR)"])

    rows = (
        db.query(ARRMonthlySummary)
        .filter(ARRMonthlySummary.snapshot_id == snapshot_id)
        .order_by(ARRMonthlySummary.month, ARRMonthlySummary.product_type)
        .all()
    )
    for r in rows:
        ws.append([
            r.month.strftime("%Y-%m") if r.month else None,
            r.product_type,
            float(r.arr_value) if r.arr_value is not None else 0,
        ])

    _autofit(ws)


# ── Sheet 2: Por cliente ──────────────────────────────────────────────────────

def _sheet_por_cliente(wb, snapshot_id: UUID, db: Session) -> None:
    ws = wb.create_sheet("Por cliente")
    _write_headers(ws, ["Mes", "Cliente", "Linea de negocio", "ARR (EUR)"])

    rows = (
        db.query(
            ARRLineItem.start_month,
            RawOpportunityLineItem.account_name,
            ARRLineItem.product_type,
            ARRLineItem.annualized_value,
        )
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
        .order_by(ARRLineItem.start_month, RawOpportunityLineItem.account_name)
        .all()
    )

    agg: dict[tuple, float] = {}
    for month, account, ptype, arr_val in rows:
        key = (month, account or "Sin cuenta", ptype or "Unknown")
        agg[key] = agg.get(key, 0.0) + float(arr_val or 0)

    for (month, account, ptype), arr_val in sorted(agg.items()):
        ws.append([
            month.strftime("%Y-%m") if isinstance(month, date) else str(month),
            account,
            ptype,
            arr_val,
        ])

    _autofit(ws)


# ── Sheet 3: Por consultor ────────────────────────────────────────────────────

def _sheet_por_consultor(wb, snapshot_id: UUID, db: Session) -> None:
    ws = wb.create_sheet("Por consultor")
    _write_headers(ws, ["Mes", "Consultor", "Linea de negocio", "ARR (EUR)"])

    rows = (
        db.query(
            ARRLineItem.start_month,
            RawOpportunityLineItem.opportunity_owner,
            ARRLineItem.product_type,
            ARRLineItem.annualized_value,
        )
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
        .order_by(ARRLineItem.start_month, RawOpportunityLineItem.opportunity_owner)
        .all()
    )

    agg: dict[tuple, float] = {}
    for month, consultant, ptype, arr_val in rows:
        key = (month, consultant or "Sin consultor", ptype or "Unknown")
        agg[key] = agg.get(key, 0.0) + float(arr_val or 0)

    for (month, consultant, ptype), arr_val in sorted(agg.items()):
        ws.append([
            month.strftime("%Y-%m") if isinstance(month, date) else str(month),
            consultant,
            ptype,
            arr_val,
        ])

    _autofit(ws)


# ── Sheet 4: Por país ─────────────────────────────────────────────────────────

def _sheet_por_pais(wb, snapshot_id: UUID, db: Session) -> None:
    ws = wb.create_sheet("Por pais")
    _write_headers(ws, ["Mes", "Pais", "ARR (EUR)"])

    rows = (
        db.query(
            ARRLineItem.start_month,
            ARRLineItem.consultant_country,
            ARRLineItem.annualized_value,
        )
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
        .order_by(ARRLineItem.start_month, ARRLineItem.consultant_country)
        .all()
    )

    agg: dict[tuple, float] = {}
    for month, country, arr_val in rows:
        key = (month, country or "Sin pais")
        agg[key] = agg.get(key, 0.0) + float(arr_val or 0)

    for (month, country), arr_val in sorted(agg.items()):
        ws.append([
            month.strftime("%Y-%m") if isinstance(month, date) else str(month),
            country,
            arr_val,
        ])

    _autofit(ws)


# ── Sheet 5: Líneas brutas ────────────────────────────────────────────────────

def _sheet_lineas_brutas(wb, snapshot_id: UUID, db: Session) -> None:
    ws = wb.create_sheet("Lineas brutas")
    _write_headers(ws, [
        "opportunity_id",
        "account_name",
        "product_name",
        "product_type",
        "consultant_name",
        "start_date",
        "end_date",
        "real_price",
        "service_days",
        "annualized_value",
        "excluded_from_arr",
    ])

    rows = (
        db.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == snapshot_id)
        .order_by(RawOpportunityLineItem.account_name, ARRLineItem.start_month)
        .all()
    )

    for arr, raw in rows:
        ws.append([
            raw.sf_opportunity_id,
            raw.account_name,
            raw.product_name,
            arr.product_type,
            raw.opportunity_owner,
            arr.effective_start_date.isoformat() if arr.effective_start_date else None,
            arr.effective_end_date.isoformat() if arr.effective_end_date else None,
            float(arr.real_price) if arr.real_price is not None else 0,
            arr.service_days,
            float(arr.annualized_value) if arr.annualized_value is not None else 0,
            arr.excluded_from_arr,
        ])

    _autofit(ws)

"""Shared Excel import pipeline for manual ARR snapshot creation."""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from io import BytesIO
from typing import Optional

import openpyxl
from sqlalchemy.orm import Session

from app.backend.core.alert_checker import summarize_snapshot_quality
from app.backend.core.arr_calculator import ARRCalculator, RawLineItem
from app.backend.db.models import (
    ARRLineItem,
    ARRMonthlySummary,
    ConsultantCountry,
    ProductClassification,
    RawOpportunityLineItem,
    Snapshot,
    SnapshotAlert,
)


class ExcelImportError(Exception):
    """Raised when a workbook cannot be parsed or imported."""


@dataclass
class ExcelImportSummary:
    snapshot: Snapshot
    rows_read: int


def _parse_date_text(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    try:
        n = float(s)
        return date(1899, 12, 30) + timedelta(days=int(n))
    except (ValueError, TypeError):
        return None


def _decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def _str(value) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def load_product_classifications(wb) -> dict:
    try:
        ws = wb["Productos SF SAAS"]
    except KeyError as exc:
        raise ExcelImportError("La hoja 'Productos SF SAAS' no existe en el Excel.") from exc

    result = {}
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or row[1] is None:
            continue
        name = _str(row[1])
        if not name:
            continue
        result[name] = {
            "product_code": _str(row[2]),
            "business_line": _str(row[4]),
            "category": _str(row[5]),
            "subcategory": _str(row[6]),
            "product_type": _str(row[7]),
        }
    return result


def load_consultant_countries(wb) -> dict:
    sheet_names = ["PaÃ­s Consultor", "País Consultor"]
    ws = None
    for sheet_name in sheet_names:
        if sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            break
    if ws is None:
        raise ExcelImportError("La hoja de pais consultor no existe en el Excel.")

    result = {}
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not header_found:
            if row[2] == "Consultor":
                header_found = True
            continue
        name = _str(row[2])
        country = _str(row[3])
        if name and country:
            result[name] = country
    return result


def load_opos_rows(wb):
    try:
        ws = wb["Opos con Productos"]
    except KeyError as exc:
        raise ExcelImportError("La hoja 'Opos con Productos' no existe en el Excel.") from exc

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        if row[9] is None and row[2] is None:
            continue

        close_date = _parse_date_text(row[6])
        if close_date is None:
            continue

        product_name = _str(row[9])
        if not product_name:
            continue

        unit_price = _decimal(row[10]) or Decimal("0")
        quantity = _decimal(row[15]) or Decimal("1")

        opp_key = f"{_str(row[2]) or ''}-{close_date}"
        sf_opportunity_id = "EXCEL_" + hashlib.md5(opp_key.encode()).hexdigest()[:12].upper()
        line_key = f"{opp_key}-{product_name}-{unit_price}-{quantity}"
        sf_line_item_id = "EXCL_" + hashlib.md5(line_key.encode()).hexdigest()[:13].upper()

        yield {
            "sf_opportunity_id": sf_opportunity_id,
            "sf_line_item_id": sf_line_item_id,
            "opportunity_owner": _str(row[0]) or "Unknown",
            "account_name": _str(row[1]),
            "opportunity_name": _str(row[2]),
            "opportunity_type": _str(row[3]),
            "channel_type": _str(row[4]),
            "opportunity_amount": _decimal(row[5]),
            "close_date": close_date,
            "product_name": product_name,
            "unit_price": unit_price,
            "subscription_start_date": _parse_date_text(row[11]),
            "subscription_end_date": _parse_date_text(row[12]),
            "licence_period_months": int(row[13]) if row[13] is not None else None,
            "business_line": _str(row[14]),
            "quantity": quantity,
            "product_code": _str(row[16]),
        }


def upsert_product_classifications(session: Session, products: dict):
    for name, info in products.items():
        existing = session.query(ProductClassification).filter_by(product_name=name).first()
        if existing:
            existing.product_type = info["product_type"] or "UNCLASSIFIED"
            existing.product_code = info["product_code"]
            existing.category = info["category"]
            existing.subcategory = info["subcategory"]
            existing.business_line = info["business_line"]
        else:
            session.add(
                ProductClassification(
                    product_name=name,
                    product_type=info["product_type"] or "UNCLASSIFIED",
                    product_code=info["product_code"],
                    category=info["category"],
                    subcategory=info["subcategory"],
                    business_line=info["business_line"],
                )
            )
    session.flush()


def upsert_consultant_countries(session: Session, countries: dict):
    for name, country in countries.items():
        existing = session.query(ConsultantCountry).filter_by(consultant_name=name).first()
        if existing:
            existing.country = country
        else:
            session.add(ConsultantCountry(consultant_name=name, country=country))
    session.flush()


def create_snapshot(session: Session, *, triggered_by: str, notes: str) -> Snapshot:
    snap = Snapshot(
        id=uuid.uuid4(),
        sync_type="excel_import",
        triggered_by=triggered_by,
        status="processing",
        notes=notes,
    )
    session.add(snap)
    session.flush()
    return snap


def insert_raw_items(session: Session, snapshot_id, rows) -> list[RawOpportunityLineItem]:
    inserted = []
    for row in rows:
        item = RawOpportunityLineItem(
            id=uuid.uuid4(),
            snapshot_id=snapshot_id,
            sf_opportunity_id=row["sf_opportunity_id"],
            sf_line_item_id=row["sf_line_item_id"],
            opportunity_name=row["opportunity_name"],
            account_name=row["account_name"],
            opportunity_owner=row["opportunity_owner"],
            opportunity_type=row["opportunity_type"],
            channel_type=row["channel_type"],
            opportunity_amount=row["opportunity_amount"],
            close_date=row["close_date"],
            product_name=row["product_name"],
            product_code=row["product_code"],
            unit_price=row["unit_price"],
            quantity=row["quantity"],
            subscription_start_date=row["subscription_start_date"],
            subscription_end_date=row["subscription_end_date"],
            licence_period_months=row["licence_period_months"],
            business_line=row["business_line"],
        )
        session.add(item)
        inserted.append(item)
    session.flush()
    return inserted


def _all_months_in_snapshot(arr_snapshot) -> list[date]:
    months = set()
    for item in arr_snapshot.saas_items():
        m = item.start_month
        while m <= item.end_month_normalized:
            months.add(m)
            if m.month == 12:
                m = m.replace(year=m.year + 1, month=1)
            else:
                m = m.replace(month=m.month + 1)
    return sorted(months)


def run_calculation_and_store(session: Session, snapshot: Snapshot, raw_items):
    products = {
        p.product_name: p.product_type for p in session.query(ProductClassification).all()
    }
    countries = {
        c.consultant_name: c.country for c in session.query(ConsultantCountry).all()
    }

    calc = ARRCalculator(products, countries)
    domain_items = []
    raw_by_id = {}
    for raw in raw_items:
        domain = RawLineItem(
            sf_opportunity_id=str(raw.sf_opportunity_id),
            sf_line_item_id=str(raw.sf_line_item_id),
            opportunity_name=raw.opportunity_name or "",
            account_name=raw.account_name or "",
            opportunity_owner=raw.opportunity_owner or "",
            opportunity_type=raw.opportunity_type or "",
            channel_type=raw.channel_type or "",
            close_date=raw.close_date,
            product_name=raw.product_name,
            unit_price=Decimal(str(raw.unit_price)),
            quantity=Decimal(str(raw.quantity)),
            subscription_start_date=raw.subscription_start_date,
            subscription_end_date=raw.subscription_end_date,
            licence_period_months=raw.licence_period_months,
            business_line=raw.business_line,
            opportunity_amount=Decimal(str(raw.opportunity_amount))
            if raw.opportunity_amount
            else None,
            product_code=raw.product_code,
        )
        domain_items.append(domain)
        raw_by_id[raw.sf_line_item_id] = raw.id

    arr_snapshot = calc.process_all(domain_items)

    for result in arr_snapshot.line_items:
        session.add(
            ARRLineItem(
                id=uuid.uuid4(),
                snapshot_id=snapshot.id,
                raw_line_item_id=raw_by_id[result.raw.sf_line_item_id],
                product_type=result.product_type,
                is_saas=result.is_saas,
                effective_start_date=result.effective_start_date,
                effective_end_date=result.effective_end_date,
                used_start_fallback=result.used_start_fallback,
                used_end_fallback=result.used_end_fallback,
                start_month=result.start_month,
                end_month_normalized=result.end_month_normalized,
                service_days=result.service_days,
                real_price=result.real_price,
                daily_price=result.daily_price,
                annualized_value=result.annualized_value,
                consultant_country=result.consultant_country,
                data_quality_flags=result.data_quality_flags,
            )
        )
    session.flush()

    all_months = _all_months_in_snapshot(arr_snapshot)
    monthly = calc.build_monthly_summary(arr_snapshot, all_months)
    for month_start, by_product in monthly.items():
        for product_type, arr_value in by_product.items():
            month_end = (
                month_start.replace(month=month_start.month % 12 + 1, day=1) - timedelta(days=1)
                if month_start.month < 12
                else month_start.replace(day=31)
            )
            count = sum(
                1
                for item in arr_snapshot.saas_items()
                if item.product_type == product_type
                and item.start_month <= month_end
                and item.end_month_normalized >= month_start
            )
            session.add(
                ARRMonthlySummary(
                    snapshot_id=snapshot.id,
                    month=month_start,
                    product_type=product_type,
                    arr_value=arr_value,
                    line_items_count=count,
                )
            )
    session.flush()

    for alert in arr_snapshot.alerts:
        session.add(
            SnapshotAlert(
                id=uuid.uuid4(),
                snapshot_id=snapshot.id,
                alert_type=alert["alert_type"],
                severity=alert["severity"],
                sf_opportunity_id=alert.get("sf_opportunity_id"),
                opportunity_name=alert.get("opportunity_name"),
                account_name=alert.get("account_name"),
                product_name=alert.get("product_name"),
                description=alert["description"],
            )
        )
    session.flush()

    quality = summarize_snapshot_quality(arr_snapshot)
    snapshot.status = "completed"
    snapshot.unclassified_products_count = quality["unclassified_products"]
    snapshot.alerts_count = quality["total_alerts"]
    snapshot.sf_records_fetched = len(raw_items)
    snapshot.sf_records_processed = len(arr_snapshot.line_items)
    return arr_snapshot


def import_excel_workbook(
    session: Session,
    wb,
    *,
    triggered_by: str = "api_excel_upload",
    notes: Optional[str] = None,
) -> ExcelImportSummary:
    t0 = datetime.now()

    products = load_product_classifications(wb)
    countries = load_consultant_countries(wb)
    rows = list(load_opos_rows(wb))

    if not rows:
        raise ExcelImportError("El Excel no contiene filas validas en 'Opos con Productos'.")

    try:
        upsert_product_classifications(session, products)
        upsert_consultant_countries(session, countries)

        snapshot = create_snapshot(
            session,
            triggered_by=triggered_by,
            notes=notes or "Importado manualmente desde Excel",
        )
        raw_items = insert_raw_items(session, snapshot.id, rows)
        run_calculation_and_store(session, snapshot, raw_items)

        snapshot.duration_seconds = round((datetime.now() - t0).total_seconds(), 2)
        session.commit()
        session.refresh(snapshot)
        return ExcelImportSummary(snapshot=snapshot, rows_read=len(rows))
    except Exception:
        session.rollback()
        raise


def import_excel_bytes(
    session: Session,
    file_bytes: bytes,
    *,
    triggered_by: str = "api_excel_upload",
    notes: Optional[str] = None,
) -> ExcelImportSummary:
    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
    except Exception as exc:
        raise ExcelImportError("No se pudo abrir el fichero Excel. Usa un .xlsx valido.") from exc

    return import_excel_workbook(
        session,
        wb,
        triggered_by=triggered_by,
        notes=notes,
    )

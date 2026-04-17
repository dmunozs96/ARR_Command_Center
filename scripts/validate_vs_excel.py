"""
Validate that the ARR calculated by the app matches the Excel for each line item.

The Excel computes (col AJ = servicio_anualizado):
  annualized_value = (real_price / service_days) * 365

This script reads the Excel directly and re-runs the same calculation in Python,
then compares with values stored in the database (arr_line_items).

Usage:
    python scripts/validate_vs_excel.py [--excel PATH] [--snapshot-id UUID] [--env PATH]

Exit code:
    0 — all differences < 0.01€
    1 — one or more differences >= 0.01€
"""

import argparse
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import openpyxl

EXCEL_DEFAULT = Path(__file__).resolve().parents[1] / "data_samples" / "raw_excel" / "ARR Oportunidad.xlsx"
TOLERANCE = Decimal("0.01")


# ---------------------------------------------------------------------------
# Replicate Excel calculation in pure Python (no DB)
# ---------------------------------------------------------------------------

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
    return None


def _decimal(v) -> Optional[Decimal]:
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except Exception:
        return None


def compute_excel_annualized(row) -> Optional[Decimal]:
    """
    Replicates the Excel column AJ (servicio_anualizado) for a single row.

    row indices (0-based):
      6  = Fecha de cierre (close_date text)
      10 = Precio de venta (unit_price)
      11 = Subscription Start Date (text)
      12 = Subscription End Date (text)
      15 = Cantidad (quantity)
    """
    close_date = _parse_date_text(row[6])
    unit_price = _decimal(row[10])
    quantity = _decimal(row[15])

    if close_date is None or unit_price is None or quantity is None:
        return None

    start = _parse_date_text(row[11])
    end = _parse_date_text(row[12])

    # AS-01: fallback start
    effective_start = start if start is not None else close_date
    # AS-02: fallback end
    effective_end = end if end is not None else (effective_start + timedelta(days=365))

    if effective_start > effective_end:
        return None

    real_price = quantity * unit_price
    start_month = effective_start.replace(day=1)
    raw_days = (effective_end - effective_start).days

    if raw_days <= 0:
        raw_days = 30

    end_month_normalized = start_month + timedelta(days=raw_days - 1)
    service_days = (end_month_normalized - start_month).days

    if service_days <= 0:
        service_days = 30

    daily_price = real_price / Decimal(str(service_days))
    annualized = daily_price * Decimal("365")
    return annualized.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def load_excel_results(excel_path: str) -> list:
    """Return list of {product_name, opportunity_name, annualized_excel} for all data rows."""
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb["Opos con Productos"]
    results = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        product_name = row[9]
        if product_name is None:
            continue
        annualized = compute_excel_annualized(row)
        if annualized is None:
            continue
        results.append({
            "opportunity_name": str(row[2]) if row[2] else "",
            "account_name": str(row[1]) if row[1] else "",
            "product_name": str(product_name),
            "unit_price": _decimal(row[10]) or Decimal("0"),
            "quantity": _decimal(row[15]) or Decimal("1"),
            "close_date": str(row[6]) if row[6] else "",
            "annualized_excel": annualized,
        })
    return results


# ---------------------------------------------------------------------------
# Database comparison
# ---------------------------------------------------------------------------

def load_db_results(session, snapshot_id=None) -> list:
    """Load arr_line_items from the most recent (or specified) snapshot."""
    from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot

    if snapshot_id:
        snap = session.query(Snapshot).filter_by(id=snapshot_id).first()
    else:
        snap = session.query(Snapshot).filter_by(sync_type="excel_import") \
                      .order_by(Snapshot.created_at.desc()).first()

    if snap is None:
        print("ERROR: No excel_import snapshot found in the database.")
        print("       Run: python scripts/import_excel_data.py first.")
        sys.exit(2)

    print(f"Comparing against snapshot: {snap.id} (created {snap.created_at})")

    items = (
        session.query(ARRLineItem, RawOpportunityLineItem)
        .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(ARRLineItem.snapshot_id == snap.id)
        .all()
    )

    return [
        {
            "opportunity_name": raw.opportunity_name or "",
            "account_name": raw.account_name or "",
            "product_name": raw.product_name,
            "unit_price": Decimal(str(raw.unit_price)),
            "quantity": Decimal(str(raw.quantity)),
            "close_date": str(raw.close_date),
            "annualized_db": Decimal(str(ali.annualized_value)),
            "exclude": ali.exclude_from_arr if hasattr(ali, "exclude_from_arr") else False,
        }
        for ali, raw in items
    ]


# ---------------------------------------------------------------------------
# Matching and comparison
# ---------------------------------------------------------------------------

def make_key(item: dict, price_field: str) -> str:
    """Composite key for matching Excel rows to DB rows."""
    return f"{item['opportunity_name']}|{item['product_name']}|{item[price_field]}|{item['quantity']}|{item['close_date']}"


def compare(excel_rows: list, db_rows: list) -> tuple:
    """
    Returns (ok_count, fail_count, unmatched_count, failures).
    """
    db_index = {}
    for row in db_rows:
        k = make_key(row, "unit_price")
        db_index.setdefault(k, []).append(row)

    ok = 0
    fail = 0
    unmatched = 0
    failures = []

    for ex_row in excel_rows:
        k = make_key(ex_row, "unit_price")
        candidates = db_index.get(k, [])

        if not candidates:
            unmatched += 1
            continue

        db_row = candidates.pop(0)
        diff = abs(ex_row["annualized_excel"] - db_row["annualized_db"])

        if diff < TOLERANCE:
            ok += 1
        else:
            fail += 1
            failures.append({
                "opportunity": ex_row["opportunity_name"],
                "product": ex_row["product_name"],
                "excel": ex_row["annualized_excel"],
                "db": db_row["annualized_db"],
                "diff": diff,
            })

    return ok, fail, unmatched, failures


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Validate app ARR vs Excel")
    parser.add_argument("--excel", default=str(EXCEL_DEFAULT))
    parser.add_argument("--snapshot-id", default=None)
    parser.add_argument("--env", default=".env")
    parser.add_argument("--show-failures", type=int, default=20,
                        help="Max number of failures to show (default 20)")
    args = parser.parse_args()

    from dotenv import load_dotenv
    load_dotenv(args.env)

    print(f"Loading Excel from: {args.excel}")
    excel_rows = load_excel_results(args.excel)
    print(f"Excel rows with valid calculation: {len(excel_rows)}")

    from app.backend.db.connection import SessionLocal
    session = SessionLocal()
    try:
        db_rows = load_db_results(session, args.snapshot_id)
        print(f"DB rows: {len(db_rows)}")
    finally:
        session.close()

    print("Comparing...")
    ok, fail, unmatched, failures = compare(excel_rows, db_rows)

    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"  Matched and OK  : {ok}")
    print(f"  Mismatched      : {fail}")
    print(f"  Unmatched (Excel only): {unmatched}")
    print(f"  Tolerance       : {TOLERANCE}€ per line item")

    if failures:
        print(f"\nFirst {min(len(failures), args.show_failures)} failures:")
        for f in failures[:args.show_failures]:
            print(f"  [{f['diff']:.4f}€] {f['opportunity']} | {f['product']}")
            print(f"           Excel: {f['excel']} | DB: {f['db']}")

    if fail == 0 and unmatched == 0:
        print(f"\n✓ PASS — All {ok} line items match within {TOLERANCE}€")
        sys.exit(0)
    else:
        print(f"\n✗ FAIL — {fail} mismatches, {unmatched} unmatched rows")
        sys.exit(1)


if __name__ == "__main__":
    main()

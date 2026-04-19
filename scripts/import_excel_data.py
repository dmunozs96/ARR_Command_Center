"""
Import data from 'ARR Oportunidad.xlsx' into the database.

Usage:
    cd ARR_Command_Center
    python scripts/import_excel_data.py [--excel PATH] [--env PATH]
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

from app.backend.core.excel_importer import ExcelImportError, import_excel_bytes
from app.backend.db.connection import SessionLocal

EXCEL_DEFAULT = (
    Path(__file__).resolve().parents[1] / "data_samples" / "raw_excel" / "ARR Oportunidad.xlsx"
)


def main():
    parser = argparse.ArgumentParser(description="Import Excel ARR data into the database")
    parser.add_argument("--excel", default=str(EXCEL_DEFAULT), help="Path to the Excel file")
    parser.add_argument("--env", default=".env", help="Path to .env file")
    args = parser.parse_args()

    load_dotenv(args.env)

    excel_path = Path(args.excel)
    print(f"Loading Excel: {excel_path}")

    session = SessionLocal()
    try:
        summary = import_excel_bytes(
            session,
            excel_path.read_bytes(),
            triggered_by="import_excel_data.py",
            notes=f"Importado desde {excel_path.name}",
        )
        print(
            "Done. "
            f"Snapshot {summary.snapshot.id} created with {summary.snapshot.sf_records_processed} "
            f"line items and {summary.snapshot.alerts_count} alerts."
        )
    except ExcelImportError as exc:
        print(f"ERROR: {exc}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()

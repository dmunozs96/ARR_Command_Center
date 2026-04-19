"""
Smoke test for the Salesforce integration.

Usage:
    python scripts/test_sf_connection.py --sample-size 5
"""

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.backend.core.sf_extractor import (
    SalesforceConfigurationError,
    SalesforceExtractor,
    SalesforceSyncError,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Test Salesforce connectivity for ARR Command Center")
    parser.add_argument("--env", default=".env", help="Path to env file")
    parser.add_argument("--sample-size", type=int, default=5, help="Number of sample records to show")
    args = parser.parse_args()

    load_dotenv(args.env)
    extractor = SalesforceExtractor()

    try:
        auth = extractor.authenticate()
        print("Salesforce authentication: OK")
        print(f"Instance URL: {auth.instance_url}")
        print(f"API version : {extractor.settings.api_version}")
        print(f"Stage filter: {extractor.settings.stage_name}")
        print()
        print("SOQL query:")
        print(extractor.build_query())
        print()

        records = extractor.fetch_sample_records(limit=args.sample_size)
        print(f"Sample records returned: {len(records)}")
        for index, record in enumerate(records, start=1):
            print(f"\nRecord {index}")
            print(json.dumps(record, indent=2, default=str))
        return 0
    except SalesforceConfigurationError as exc:
        print(f"Configuration error: {exc}")
        return 2
    except SalesforceSyncError as exc:
        print(f"Salesforce sync error: {exc}")
        return 3


if __name__ == "__main__":
    raise SystemExit(main())

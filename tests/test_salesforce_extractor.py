from datetime import date
from decimal import Decimal

import pytest

from app.backend.config.settings import SalesforceSettings
from app.backend.core.sf_extractor import (
    SalesforceConfigurationError,
    SalesforceExtractor,
    SalesforceSyncError,
)


def _settings(**overrides):
    base = SalesforceSettings(
        client_id="cid",
        client_secret="secret",
        username="user@example.com",
        password="pass",
        security_token="token",
        instance_url="https://iseazy.my.salesforce.com",
        auth_url="https://login.salesforce.com",
        api_version="60.0",
        timeout_seconds=30,
        stage_name="Closed Won",
        opportunity_channel_field="LeadSource",
        lineitem_start_date_field="ServiceDate",
        lineitem_end_date_field="EndDate",
        lineitem_license_months_field="Licence_Period_Months__c",
        lineitem_business_line_field="Product2.Family",
    )
    return SalesforceSettings(**{**base.__dict__, **overrides})


def test_build_query_uses_configured_fields():
    extractor = SalesforceExtractor(settings=_settings())
    query = extractor.build_query()

    assert "Opportunity.StageName = 'Closed Won'" in query
    assert "LeadSource" in query
    assert "ServiceDate" in query
    assert "EndDate" in query
    assert "Licence_Period_Months__c" in query
    assert "Product2.Family" in query


def test_record_to_raw_line_item_maps_nested_salesforce_payload():
    extractor = SalesforceExtractor(settings=_settings())
    record = {
        "Id": "00kLINEITEM001",
        "UnitPrice": "12000.50",
        "Quantity": "2",
        "ServiceDate": "2026-01-01",
        "EndDate": "2026-12-31",
        "Licence_Period_Months__c": "12",
        "Product2": {
            "Name": "Licencias LMS",
            "ProductCode": "LMS-001",
            "Family": "isEazy LMS",
        },
        "Opportunity": {
            "Id": "006OPP001234567",
            "Name": "Expansion ACME",
            "Type": "New Business",
            "Amount": "24001.00",
            "CloseDate": "2026-01-15",
            "LeadSource": "Inbound",
            "Owner": {"Name": "Maria Lopez"},
            "Account": {"Name": "ACME Corp"},
        },
    }

    raw = extractor._record_to_raw_line_item(record)

    assert raw.sf_opportunity_id == "006OPP001234567"
    assert raw.sf_line_item_id == "00kLINEITEM001"
    assert raw.product_name == "Licencias LMS"
    assert raw.product_code == "LMS-001"
    assert raw.business_line == "isEazy LMS"
    assert raw.opportunity_owner == "Maria Lopez"
    assert raw.account_name == "ACME Corp"
    assert raw.channel_type == "Inbound"
    assert raw.close_date == date(2026, 1, 15)
    assert raw.subscription_start_date == date(2026, 1, 1)
    assert raw.subscription_end_date == date(2026, 12, 31)
    assert raw.licence_period_months == 12
    assert raw.unit_price == Decimal("12000.50")
    assert raw.quantity == Decimal("2")


def test_validate_settings_requires_credentials():
    extractor = SalesforceExtractor(settings=_settings(client_id=""))
    with pytest.raises(SalesforceConfigurationError):
        extractor.fetch_sample_records(limit=1)


def test_fetch_raw_line_items_raises_when_salesforce_returns_no_rows(monkeypatch):
    extractor = SalesforceExtractor(settings=_settings())

    class DummyClient:
        def query_all_iter(self, query):
            return iter([])

    monkeypatch.setattr(extractor, "_build_salesforce_client", lambda: DummyClient())

    with pytest.raises(SalesforceSyncError):
        extractor.fetch_raw_line_items()

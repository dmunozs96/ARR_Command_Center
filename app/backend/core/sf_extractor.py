"""
Salesforce extractor for Phase E.

Authenticates with Salesforce OAuth2, runs a full-sync query over
OpportunityLineItem, and transforms the response into RawLineItem objects.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

from app.backend.config.settings import SalesforceSettings, get_salesforce_settings
from app.backend.core.arr_calculator import RawLineItem


class SalesforceConfigurationError(RuntimeError):
    """Raised when the local Salesforce configuration is incomplete."""


class SalesforceSyncError(RuntimeError):
    """Raised when Salesforce authentication or extraction fails."""


@dataclass(frozen=True)
class SalesforceAuthSession:
    instance_url: str
    access_token: str


def _parse_date(value: Any) -> Optional[date]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _parse_decimal(value: Any, default: str = "0") -> Decimal:
    if value in (None, ""):
        return Decimal(default)
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def _parse_int(value: Any) -> Optional[int]:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _nested_get(payload: dict[str, Any], dotted_path: str) -> Any:
    current: Any = payload
    for segment in dotted_path.split("."):
        if current is None or not isinstance(current, dict):
            return None
        current = current.get(segment)
    return current


class SalesforceExtractor:
    def __init__(self, settings: Optional[SalesforceSettings] = None):
        self.settings = settings or get_salesforce_settings()

    def fetch_raw_line_items(self) -> list[RawLineItem]:
        self._validate_settings()
        client = self._build_salesforce_client()
        query = self.build_query()

        try:
            records = list(client.query_all_iter(query))
        except Exception as exc:  # pragma: no cover - depends on Salesforce runtime
            raise SalesforceSyncError(f"Salesforce query failed: {exc}") from exc

        raw_items = [self._record_to_raw_line_item(record) for record in records]
        if not raw_items:
            raise SalesforceSyncError(
                "Salesforce returned 0 line items for the configured full sync query."
            )
        return raw_items

    def fetch_sample_records(self, limit: int = 5) -> list[dict[str, Any]]:
        self._validate_settings()
        client = self._build_salesforce_client()
        query = f"{self.build_query()} LIMIT {limit}"

        try:
            result = client.query_all(query)
        except Exception as exc:  # pragma: no cover - depends on Salesforce runtime
            raise SalesforceSyncError(f"Salesforce sample query failed: {exc}") from exc

        return result.get("records", [])

    def build_query(self) -> str:
        fields = [
            "Id",
            "Opportunity.Id",
            "Opportunity.Name",
            "Opportunity.Type",
            "Opportunity.Amount",
            "Opportunity.CloseDate",
            "Opportunity.CreatedDate",
            "Opportunity.StageName",
            "Opportunity.Owner.Name",
            "Opportunity.Account.Name",
            "Product2.Name",
            "Product2.ProductCode",
            "UnitPrice",
            "Quantity",
        ]

        for optional_field in (
            self._opportunity_field_query_path(self.settings.opportunity_channel_field),
            self.settings.lineitem_start_date_field,
            self.settings.lineitem_end_date_field,
            self.settings.lineitem_license_months_field,
            self.settings.lineitem_business_line_field,
        ):
            if optional_field and optional_field not in fields:
                fields.append(optional_field)

        stage_name = self.settings.stage_name.replace("'", "\\'")
        return (
            f"SELECT {', '.join(fields)} "
            f"FROM OpportunityLineItem "
            f"WHERE Opportunity.StageName = '{stage_name}' "
            f"ORDER BY Opportunity.CloseDate ASC"
        )

    def authenticate(self) -> SalesforceAuthSession:
        self._validate_settings()
        token_url = f"{self._resolve_auth_base_url()}/services/oauth2/token"
        payload = {
            "grant_type": "password",
            "client_id": self.settings.client_id,
            "client_secret": self.settings.client_secret,
            "username": self.settings.username,
            "password": f"{self.settings.password}{self.settings.security_token}",
        }

        try:
            response = httpx.post(
                token_url,
                data=payload,
                timeout=self.settings.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip()
            raise SalesforceSyncError(
                f"Salesforce auth failed with status {exc.response.status_code}: {detail}"
            ) from exc
        except httpx.HTTPError as exc:
            raise SalesforceSyncError(f"Salesforce auth request failed: {exc}") from exc

        data = response.json()
        access_token = data.get("access_token")
        instance_url = data.get("instance_url") or self.settings.instance_url
        if not access_token or not instance_url:
            raise SalesforceSyncError(
                "Salesforce auth response missing access_token or instance_url."
            )

        return SalesforceAuthSession(instance_url=instance_url, access_token=access_token)

    def _build_salesforce_client(self):
        auth = self.authenticate()
        try:
            from simple_salesforce import Salesforce
        except ImportError as exc:  # pragma: no cover
            raise SalesforceSyncError(
                "simple-salesforce is not installed in the current environment."
            ) from exc

        return Salesforce(
            instance_url=auth.instance_url,
            session_id=auth.access_token,
            version=self.settings.api_version,
            client_id="ARRCommandCenter",
        )

    def _record_to_raw_line_item(self, record: dict[str, Any]) -> RawLineItem:
        opportunity = record.get("Opportunity") or {}
        product = record.get("Product2") or {}

        sf_opportunity_id = _normalize_text(opportunity.get("Id"))
        sf_line_item_id = _normalize_text(record.get("Id"))
        close_date = _parse_date(opportunity.get("CloseDate"))
        product_name = _normalize_text(product.get("Name"))

        if not sf_opportunity_id or not sf_line_item_id or not close_date or not product_name:
            raise SalesforceSyncError(
                "Salesforce record missing required fields: Opportunity.Id, "
                "Opportunity.CloseDate, OpportunityLineItem.Id or Product2.Name."
            )

        if "." in self.settings.opportunity_channel_field:
            channel_value = _nested_get(record, self.settings.opportunity_channel_field)
        else:
            channel_value = opportunity.get(self.settings.opportunity_channel_field)

        return RawLineItem(
            sf_opportunity_id=sf_opportunity_id,
            sf_line_item_id=sf_line_item_id,
            opportunity_name=_normalize_text(opportunity.get("Name")),
            account_name=_normalize_text(_nested_get(opportunity, "Account.Name")),
            opportunity_owner=_normalize_text(_nested_get(opportunity, "Owner.Name"), "Unknown"),
            opportunity_type=_normalize_text(opportunity.get("Type")),
            channel_type=_normalize_text(channel_value, "unknown"),
            close_date=close_date,
            product_name=product_name,
            unit_price=_parse_decimal(record.get("UnitPrice")),
            quantity=_parse_decimal(record.get("Quantity"), default="1"),
            subscription_start_date=_parse_date(
                _nested_get(record, self.settings.lineitem_start_date_field)
            ),
            subscription_end_date=_parse_date(
                _nested_get(record, self.settings.lineitem_end_date_field)
            ),
            licence_period_months=_parse_int(
                _nested_get(record, self.settings.lineitem_license_months_field)
            ),
            business_line=_normalize_text(
                _nested_get(record, self.settings.lineitem_business_line_field)
            )
            or None,
            opportunity_amount=_parse_decimal(opportunity.get("Amount"), default="0"),
            product_code=_normalize_text(product.get("ProductCode")) or None,
        )

    def _resolve_auth_base_url(self) -> str:
        if self.settings.auth_url:
            return self.settings.auth_url.rstrip("/")
        if self.settings.instance_url:
            parsed = urlparse(self.settings.instance_url)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
        return "https://login.salesforce.com"

    def _opportunity_field_query_path(self, field_name: str) -> str:
        if not field_name:
            return field_name
        if "." in field_name:
            return field_name
        return f"Opportunity.{field_name}"

    def _validate_settings(self) -> None:
        required = {
            "SF_CLIENT_ID": self.settings.client_id,
            "SF_CLIENT_SECRET": self.settings.client_secret,
            "SF_USERNAME": self.settings.username,
            "SF_PASSWORD": self.settings.password,
            "SF_SECURITY_TOKEN": self.settings.security_token,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise SalesforceConfigurationError(
                f"Missing Salesforce configuration: {', '.join(missing)}"
            )

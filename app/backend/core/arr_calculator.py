"""
ARR calculation engine.

Replicates the Excel logic from 'Opos con Productos' exactly:
  annualized_value = (real_price / service_days) * 365

Where:
  real_price           = quantity * unit_price
  start_month          = first day of effective_start month
  raw_days             = effective_end - effective_start (days)
  end_month_normalized = start_month + raw_days - 1
  service_days         = end_month_normalized - start_month
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class RawLineItem:
    """Input data from Salesforce (or Excel mock)."""
    sf_opportunity_id: str
    sf_line_item_id: str
    opportunity_name: str
    account_name: str
    opportunity_owner: str
    opportunity_type: str        # nuevo_negocio | negocio_existente | saas_variable_invoicing
    channel_type: str            # KAM | Inbound | Outbound | Partner | unknown
    close_date: date
    product_name: str
    unit_price: Decimal
    quantity: Decimal
    subscription_start_date: Optional[date]
    subscription_end_date: Optional[date]
    licence_period_months: Optional[int]
    business_line: Optional[str]
    opportunity_amount: Optional[Decimal] = None
    product_code: Optional[str] = None


@dataclass
class ARRLineItemResult:
    """Calculated ARR for a single line item."""
    raw: RawLineItem

    product_type: Optional[str]
    is_saas: bool

    effective_start_date: date
    effective_end_date: date
    used_start_fallback: bool
    used_end_fallback: bool

    start_month: date
    end_month_normalized: date
    service_days: int

    real_price: Decimal
    daily_price: Decimal
    annualized_value: Decimal

    consultant_country: str
    data_quality_flags: List[str]

    # Set to True to exclude from ARR totals
    exclude_from_arr: bool = False
    error: Optional[str] = None


@dataclass
class ARRSnapshot:
    """Results for a full calculation run."""
    line_items: List[ARRLineItemResult] = field(default_factory=list)
    alerts: List[dict] = field(default_factory=list)

    def saas_items(self) -> List[ARRLineItemResult]:
        return [i for i in self.line_items if i.is_saas and not i.exclude_from_arr]


# ---------------------------------------------------------------------------
# Calculator
# ---------------------------------------------------------------------------

class ARRCalculator:
    """
    Stateless calculator. Accepts lookup tables at construction time and
    processes lists of RawLineItem records.
    """

    def __init__(
        self,
        product_classifications: Dict[str, str],   # product_name → product_type
        consultant_countries: Dict[str, str],       # consultant_name → country
    ):
        self.product_classifications = product_classifications
        self.consultant_countries = consultant_countries

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_all(self, raw_items: List[RawLineItem]) -> ARRSnapshot:
        snapshot = ARRSnapshot()
        for raw in raw_items:
            result = self._calculate_line_item(raw)
            snapshot.line_items.append(result)
            snapshot.alerts.extend(self._alerts_from(result))
        return snapshot

    def get_arr_for_month(
        self,
        snapshot: ARRSnapshot,
        target_month_start: date,
        target_month_end: date,
        product_type_filter: Optional[str] = None,
        consultant_filter: Optional[str] = None,
        channel_filter: Optional[str] = None,
    ) -> Decimal:
        """
        Return total ARR for a given month using Modo A (service start date).

        A line item is active in month M if:
          start_month <= target_month_end  AND  end_month_normalized >= target_month_start
        """
        total = Decimal("0")
        for item in snapshot.saas_items():
            if product_type_filter and item.product_type != product_type_filter:
                continue
            if consultant_filter and item.raw.opportunity_owner != consultant_filter:
                continue
            if channel_filter and item.raw.channel_type != channel_filter:
                continue
            if item.start_month <= target_month_end and item.end_month_normalized >= target_month_start:
                total += item.annualized_value
        return total

    def build_monthly_summary(
        self,
        snapshot: ARRSnapshot,
        months: List[date],  # list of first-day-of-month dates
    ) -> Dict[date, Dict[str, Decimal]]:
        """
        Returns {month: {product_type: arr_value}} for all SaaS product types
        across the given months.
        """
        result: Dict[date, Dict[str, Decimal]] = {}
        for month_start in months:
            month_end = _last_day_of_month(month_start)
            by_product: Dict[str, Decimal] = {}
            for item in snapshot.saas_items():
                if item.start_month <= month_end and item.end_month_normalized >= month_start:
                    by_product[item.product_type] = (
                        by_product.get(item.product_type, Decimal("0")) + item.annualized_value
                    )
            result[month_start] = by_product
        return result

    # ------------------------------------------------------------------
    # Core calculation (mirrors the Excel column-by-column logic)
    # ------------------------------------------------------------------

    def _calculate_line_item(self, raw: RawLineItem) -> ARRLineItemResult:
        flags: List[str] = []

        # --- Classify product (col U in Excel) ---
        product_type = self.product_classifications.get(raw.product_name)
        if product_type is None:
            flags.append("UNCLASSIFIED_PRODUCT")
            return ARRLineItemResult(
                raw=raw,
                product_type=None,
                is_saas=False,
                effective_start_date=raw.close_date,
                effective_end_date=raw.close_date + timedelta(days=365),
                used_start_fallback=True,
                used_end_fallback=True,
                start_month=raw.close_date.replace(day=1),
                end_month_normalized=raw.close_date.replace(day=1) + timedelta(days=364),
                service_days=365,
                real_price=raw.quantity * raw.unit_price,
                daily_price=Decimal("0"),
                annualized_value=Decimal("0"),
                consultant_country=self.consultant_countries.get(raw.opportunity_owner, "Unknown"),
                data_quality_flags=flags,
                exclude_from_arr=True,
                error="UNCLASSIFIED_PRODUCT",
            )

        is_saas = product_type.startswith("SaaS")

        # --- Resolve effective dates (cols V and W in Excel) ---
        used_start_fallback = raw.subscription_start_date is None
        if used_start_fallback:
            flags.append("MISSING_START_DATE")
            effective_start = raw.close_date          # AS-01
        else:
            effective_start = raw.subscription_start_date

        used_end_fallback = raw.subscription_end_date is None
        if used_end_fallback:
            flags.append("MISSING_END_DATE")
            effective_end = effective_start + timedelta(days=365)  # AS-02
        else:
            effective_end = raw.subscription_end_date

        # --- Sanity check ---
        if effective_start > effective_end:
            flags.append("INVALID_DATES")
            return ARRLineItemResult(
                raw=raw,
                product_type=product_type,
                is_saas=is_saas,
                effective_start_date=effective_start,
                effective_end_date=effective_end,
                used_start_fallback=used_start_fallback,
                used_end_fallback=used_end_fallback,
                start_month=effective_start.replace(day=1),
                end_month_normalized=effective_start.replace(day=1),
                service_days=1,
                real_price=raw.quantity * raw.unit_price,
                daily_price=Decimal("0"),
                annualized_value=Decimal("0"),
                consultant_country=self.consultant_countries.get(raw.opportunity_owner, "Unknown"),
                data_quality_flags=flags,
                exclude_from_arr=True,
                error="INVALID_DATES",
            )

        # --- Real price (col X) ---
        real_price = raw.quantity * raw.unit_price
        if real_price < 0:
            flags.append("NEGATIVE_PRICE")

        # --- Monthly normalization (cols Y and Z in Excel) ---
        start_month = effective_start.replace(day=1)
        raw_days = (effective_end - effective_start).days   # col AB

        if raw_days <= 0:
            flags.append("DURATION_ZERO_FALLBACK")
            raw_days = 30

        end_month_normalized = start_month + timedelta(days=raw_days - 1)  # col Z

        # --- Service days = AH (same as AA in Excel) ---
        service_days = (end_month_normalized - start_month).days
        if service_days <= 0:
            flags.append("DURATION_ZERO_FALLBACK")
            service_days = 30

        # --- Duration anomaly flags ---
        if service_days > 730:
            flags.append("DURATION_ANOMALY_HIGH")
        if service_days < 15:
            flags.append("DURATION_ANOMALY_LOW")

        # --- ARR calculation (cols AI and AJ) ---
        daily_price = Decimal(str(real_price)) / Decimal(str(service_days))
        annualized_value = daily_price * Decimal("365")

        if annualized_value > Decimal("1000000"):
            flags.append("HIGH_ARR_FLAG")

        # --- Consultant country (col AG) ---
        country = self.consultant_countries.get(raw.opportunity_owner, "Unknown")
        if country == "Unknown":
            flags.append("MISSING_COUNTRY")

        return ARRLineItemResult(
            raw=raw,
            product_type=product_type,
            is_saas=is_saas,
            effective_start_date=effective_start,
            effective_end_date=effective_end,
            used_start_fallback=used_start_fallback,
            used_end_fallback=used_end_fallback,
            start_month=start_month,
            end_month_normalized=end_month_normalized,
            service_days=service_days,
            real_price=real_price,
            daily_price=daily_price,
            annualized_value=annualized_value,
            consultant_country=country,
            data_quality_flags=flags,
            exclude_from_arr=(real_price < 0),
        )

    def _alerts_from(self, item: ARRLineItemResult) -> List[dict]:
        alerts = []
        severity_map = {
            "UNCLASSIFIED_PRODUCT": "error",
            "INVALID_DATES": "error",
            "NEGATIVE_PRICE": "error",
            "MISSING_START_DATE": "warning",
            "MISSING_END_DATE": "warning",
            "DURATION_ANOMALY_HIGH": "warning",
            "DURATION_ANOMALY_LOW": "warning",
            "DURATION_ZERO_FALLBACK": "warning",
            "HIGH_ARR_FLAG": "warning",
            "MISSING_COUNTRY": "info",
        }
        for flag in item.data_quality_flags:
            alerts.append({
                "alert_type": flag,
                "severity": severity_map.get(flag, "info"),
                "sf_opportunity_id": item.raw.sf_opportunity_id,
                "opportunity_name": item.raw.opportunity_name,
                "account_name": item.raw.account_name,
                "product_name": item.raw.product_name,
                "description": _alert_description(flag, item),
            })
        return alerts


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _last_day_of_month(first_day: date) -> date:
    """Return last day of the month given its first day."""
    if first_day.month == 12:
        return first_day.replace(day=31)
    return first_day.replace(month=first_day.month + 1) - timedelta(days=1)


def _alert_description(flag: str, item: ARRLineItemResult) -> str:
    descriptions = {
        "UNCLASSIFIED_PRODUCT": f"Producto '{item.raw.product_name}' no encontrado en tabla maestra. Excluido del ARR.",
        "INVALID_DATES": f"Fecha inicio > fecha fin en oportunidad '{item.raw.opportunity_name}'.",
        "NEGATIVE_PRICE": f"Precio negativo ({item.real_price}) en '{item.raw.opportunity_name}'.",
        "MISSING_START_DATE": f"Sin fecha de inicio; se usa close_date ({item.raw.close_date}) como proxy.",
        "MISSING_END_DATE": f"Sin fecha de fin; se asumen 365 días desde el inicio.",
        "DURATION_ANOMALY_HIGH": f"Duración {item.service_days} días (>730) en '{item.raw.opportunity_name}'. Revisar manualmente.",
        "DURATION_ANOMALY_LOW": f"Duración {item.service_days} días (<15) en '{item.raw.opportunity_name}'.",
        "DURATION_ZERO_FALLBACK": "Duración 0 días; se aplica fallback de 30 días.",
        "HIGH_ARR_FLAG": f"ARR anualizado > 1.000.000€ en '{item.raw.opportunity_name}'. Revisar.",
        "MISSING_COUNTRY": f"Consultor '{item.raw.opportunity_owner}' sin país asignado.",
    }
    return descriptions.get(flag, flag)

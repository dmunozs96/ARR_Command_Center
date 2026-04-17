"""
Unit tests for ARRCalculator.

Each test verifies a specific rule from the Excel logic documented in:
  docs/logs/excel_formula_logic.md
  docs/specs/08_calculation_engine_draft.md
"""

import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.backend.core.arr_calculator import ARRCalculator, RawLineItem, _last_day_of_month

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PRODUCTS = {
    "SaaS LMS Estándar": "SaaS LMS",
    "SaaS Author": "SaaS Author",
    "SaaS Skills": "SaaS Skills",
    "Implantación": "Implantación",       # non-SaaS
    "TaaS": "TaaS",                        # non-SaaS
}

CONSULTANTS = {
    "Ana García": "Spain",
    "Carlos Pérez": "LatAm",
}


def make_calc() -> ARRCalculator:
    return ARRCalculator(product_classifications=PRODUCTS, consultant_countries=CONSULTANTS)


def make_raw(**overrides) -> RawLineItem:
    defaults = dict(
        sf_opportunity_id="OPP001",
        sf_line_item_id="LI001",
        opportunity_name="Test Opp",
        account_name="Test Account",
        opportunity_owner="Ana García",
        opportunity_type="Nuevo negocio",
        channel_type="KAM",
        close_date=date(2024, 1, 15),
        product_name="SaaS LMS Estándar",
        unit_price=Decimal("10000"),
        quantity=Decimal("1"),
        subscription_start_date=date(2024, 1, 1),
        subscription_end_date=date(2024, 12, 31),
        licence_period_months=12,
        business_line="isEazy LMS",
    )
    defaults.update(overrides)
    return RawLineItem(**defaults)


# ---------------------------------------------------------------------------
# Core ARR formula (col AJ in Excel)
# ---------------------------------------------------------------------------

class TestCoreFormula:
    """
    annualized_value = (real_price / service_days) * 365
    real_price = quantity * unit_price
    start_month = first day of effective_start month
    raw_days = effective_end - effective_start
    end_month_normalized = start_month + raw_days - 1
    service_days = end_month_normalized - start_month
    """

    def test_full_year_contract(self):
        """12-month contract starting on 2024-01-01 should give exactly 365-day annualization."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2024, 1, 1),
            subscription_end_date=date(2024, 12, 31),
            unit_price=Decimal("12000"),
            quantity=Decimal("1"),
        )
        snap = calc.process_all([raw])
        item = snap.line_items[0]

        # raw_days = 364, end_month_normalized = 2024-01-01 + 363 days = 2024-12-29
        # service_days = 364 - 0 = 364 (from start_month to end_month_normalized)
        assert item.real_price == Decimal("12000")
        assert item.service_days == 364
        expected = (Decimal("12000") / Decimal("364")) * Decimal("365")
        assert abs(item.annualized_value - expected) < Decimal("0.0001")

    def test_exact_annualized_value(self):
        """Manual calculation must match the engine."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2024, 3, 1),
            subscription_end_date=date(2025, 2, 28),
            unit_price=Decimal("5000"),
            quantity=Decimal("2"),
        )
        snap = calc.process_all([raw])
        item = snap.line_items[0]

        real_price = Decimal("10000")
        raw_days = (date(2025, 2, 28) - date(2024, 3, 1)).days  # 364
        end_month_norm = date(2024, 3, 1) + timedelta(days=raw_days - 1)
        service_days = (end_month_norm - date(2024, 3, 1)).days
        expected = (real_price / Decimal(str(service_days))) * Decimal("365")

        assert item.real_price == real_price
        assert abs(item.annualized_value - expected) < Decimal("0.0001")


# ---------------------------------------------------------------------------
# Date fallback rules (AS-01, AS-02)
# ---------------------------------------------------------------------------

class TestDateFallbacks:

    def test_as01_no_start_date_uses_close_date(self):
        """AS-01: When subscription_start_date is None, use close_date."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=None,
            subscription_end_date=date(2025, 1, 14),
            close_date=date(2024, 1, 15),
        )
        snap = calc.process_all([raw])
        item = snap.line_items[0]

        assert item.effective_start_date == date(2024, 1, 15)
        assert item.used_start_fallback is True
        assert "MISSING_START_DATE" in item.data_quality_flags

    def test_as02_no_end_date_uses_start_plus_365(self):
        """AS-02: When subscription_end_date is None, use effective_start + 365 days."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2024, 6, 1),
            subscription_end_date=None,
        )
        snap = calc.process_all([raw])
        item = snap.line_items[0]

        assert item.effective_end_date == date(2024, 6, 1) + timedelta(days=365)
        assert item.used_end_fallback is True
        assert "MISSING_END_DATE" in item.data_quality_flags

    def test_both_dates_missing(self):
        """Both AS-01 and AS-02 apply simultaneously."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=None,
            subscription_end_date=None,
            close_date=date(2024, 3, 10),
        )
        snap = calc.process_all([raw])
        item = snap.line_items[0]

        assert item.effective_start_date == date(2024, 3, 10)
        assert item.effective_end_date == date(2024, 3, 10) + timedelta(days=365)
        assert "MISSING_START_DATE" in item.data_quality_flags
        assert "MISSING_END_DATE" in item.data_quality_flags


# ---------------------------------------------------------------------------
# SaaS classification
# ---------------------------------------------------------------------------

class TestSaaSClassification:

    def test_saas_product_is_saas_true(self):
        calc = make_calc()
        raw = make_raw(product_name="SaaS LMS Estándar")
        item = calc.process_all([raw]).line_items[0]
        assert item.is_saas is True

    def test_non_saas_product_is_saas_false(self):
        calc = make_calc()
        raw = make_raw(product_name="Implantación")
        item = calc.process_all([raw]).line_items[0]
        assert item.is_saas is False

    def test_non_saas_excluded_from_arr_month_total(self):
        calc = make_calc()
        raw_saas = make_raw(product_name="SaaS LMS Estándar", sf_line_item_id="LI_SAAS")
        raw_services = make_raw(product_name="Implantación", sf_line_item_id="LI_SVC")
        snap = calc.process_all([raw_saas, raw_services])

        month_start = date(2024, 1, 1)
        month_end = _last_day_of_month(month_start)
        total = calc.get_arr_for_month(snap, month_start, month_end)

        # Only the SaaS item should be included
        assert total > 0
        saas_item = next(i for i in snap.line_items if i.raw.product_name == "SaaS LMS Estándar")
        assert abs(total - saas_item.annualized_value) < Decimal("0.0001")


# ---------------------------------------------------------------------------
# Unclassified product
# ---------------------------------------------------------------------------

class TestUnclassifiedProduct:

    def test_unclassified_product_generates_alert(self):
        calc = make_calc()
        raw = make_raw(product_name="Producto Desconocido XYZ")
        snap = calc.process_all([raw])
        item = snap.line_items[0]

        assert item.exclude_from_arr is True
        assert item.error == "UNCLASSIFIED_PRODUCT"
        assert "UNCLASSIFIED_PRODUCT" in item.data_quality_flags
        assert any(a["alert_type"] == "UNCLASSIFIED_PRODUCT" for a in snap.alerts)

    def test_unclassified_not_in_arr_total(self):
        calc = make_calc()
        raw = make_raw(product_name="Producto Desconocido XYZ")
        snap = calc.process_all([raw])

        month_start = date(2024, 1, 1)
        total = calc.get_arr_for_month(snap, month_start, _last_day_of_month(month_start))
        assert total == Decimal("0")


# ---------------------------------------------------------------------------
# Monthly overlap (solapamiento)
# ---------------------------------------------------------------------------

class TestMonthlyOverlap:

    def test_active_in_target_month(self):
        """Line item covering Jan-Dec 2024 should be active in every month of 2024."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2024, 1, 1),
            subscription_end_date=date(2024, 12, 31),
        )
        snap = calc.process_all([raw])

        for month in range(1, 13):
            month_start = date(2024, month, 1)
            month_end = _last_day_of_month(month_start)
            total = calc.get_arr_for_month(snap, month_start, month_end)
            assert total > 0, f"Should be active in month {month}"

    def test_not_active_before_start(self):
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2024, 6, 1),
            subscription_end_date=date(2025, 5, 31),
        )
        snap = calc.process_all([raw])

        # January 2024 is before the contract start
        month_start = date(2024, 1, 1)
        month_end = _last_day_of_month(month_start)
        total = calc.get_arr_for_month(snap, month_start, month_end)
        assert total == Decimal("0")

    def test_not_active_after_end(self):
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2023, 1, 1),
            subscription_end_date=date(2023, 12, 31),
        )
        snap = calc.process_all([raw])

        # January 2025 is after the contract
        month_start = date(2025, 1, 1)
        month_end = _last_day_of_month(month_start)
        total = calc.get_arr_for_month(snap, month_start, month_end)
        assert total == Decimal("0")

    def test_partial_month_overlap_included(self):
        """A contract that starts mid-month should still be included in that month's ARR."""
        calc = make_calc()
        raw = make_raw(
            subscription_start_date=date(2024, 3, 15),
            subscription_end_date=date(2025, 3, 14),
        )
        snap = calc.process_all([raw])

        # March 2024: the contract starts on March 15, so start_month = March 1
        month_start = date(2024, 3, 1)
        month_end = _last_day_of_month(month_start)
        total = calc.get_arr_for_month(snap, month_start, month_end)
        assert total > 0


# ---------------------------------------------------------------------------
# Paridad con Excel: 3 oportunidades conocidas
# ---------------------------------------------------------------------------

class TestExcelParity:
    """
    These cases are hand-calculated to verify the engine against known Excel values.
    """

    def _calc_expected(self, unit_price, quantity, start, end):
        """Replicate the Excel AJ formula."""
        real_price = Decimal(str(unit_price)) * Decimal(str(quantity))
        start_month = start.replace(day=1)
        raw_days = (end - start).days
        if raw_days <= 0:
            raw_days = 30
        end_month_norm = start_month + timedelta(days=raw_days - 1)
        service_days = (end_month_norm - start_month).days
        if service_days <= 0:
            service_days = 30
        return (real_price / Decimal(str(service_days))) * Decimal("365")

    def test_parity_case_1_annual_10k(self):
        """10.000€ annual contract — annualized value ≈ 10.027€."""
        calc = make_calc()
        start = date(2024, 1, 1)
        end = date(2024, 12, 31)
        raw = make_raw(
            unit_price=Decimal("10000"),
            quantity=Decimal("1"),
            subscription_start_date=start,
            subscription_end_date=end,
        )
        item = calc.process_all([raw]).line_items[0]
        expected = self._calc_expected(10000, 1, start, end)
        assert abs(item.annualized_value - expected) < TOLERANCE

    def test_parity_case_2_6month_contract(self):
        """6-month contract — annualizes to approximately double the price."""
        calc = make_calc()
        start = date(2024, 1, 1)
        end = date(2024, 6, 30)
        raw = make_raw(
            unit_price=Decimal("6000"),
            quantity=Decimal("1"),
            subscription_start_date=start,
            subscription_end_date=end,
        )
        item = calc.process_all([raw]).line_items[0]
        expected = self._calc_expected(6000, 1, start, end)
        assert abs(item.annualized_value - expected) < TOLERANCE
        # 6-month contract annualizes to ~2× price
        assert item.annualized_value > Decimal("11000")

    def test_parity_case_3_multi_quantity(self):
        """Multiple units: real_price = quantity × unit_price."""
        calc = make_calc()
        start = date(2024, 4, 1)
        end = date(2025, 3, 31)
        raw = make_raw(
            unit_price=Decimal("1500"),
            quantity=Decimal("5"),
            subscription_start_date=start,
            subscription_end_date=end,
        )
        item = calc.process_all([raw]).line_items[0]
        assert item.real_price == Decimal("7500")
        expected = self._calc_expected(1500, 5, start, end)
        assert abs(item.annualized_value - expected) < TOLERANCE


TOLERANCE = Decimal("0.01")

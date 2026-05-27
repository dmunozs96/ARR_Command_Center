"""Pydantic response/request schemas for the ARR Command Center API."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, PlainSerializer


JsonDecimal = Annotated[
    Decimal,
    PlainSerializer(lambda value: float(value), return_type=float, when_used="json"),
]


# ---------------------------------------------------------------------------
# Snapshots
# ---------------------------------------------------------------------------

class SnapshotSummary(BaseModel):
    id: UUID
    created_at: datetime
    sync_type: str
    triggered_by: Optional[str]
    status: str
    sf_records_fetched: Optional[int]
    sf_records_processed: Optional[int]
    alerts_count: Optional[int]
    unclassified_products_count: Optional[int]
    duration_seconds: Optional[float]
    notes: Optional[str]

    model_config = {"from_attributes": True}


class SnapshotDetail(SnapshotSummary):
    pass


# ---------------------------------------------------------------------------
# Snapshot Review
# ---------------------------------------------------------------------------

class SnapshotReviewMeta(BaseModel):
    id: UUID
    created_at: datetime
    sync_type: str
    notes: Optional[str]

    model_config = {"from_attributes": True}


class MonthlyTotalPoint(BaseModel):
    month: date
    arr_a: Optional[JsonDecimal]
    arr_b: Optional[JsonDecimal]


class SnapshotComparisonTotals(BaseModel):
    snapshot_a: SnapshotReviewMeta
    snapshot_b: SnapshotReviewMeta
    data: List[MonthlyTotalPoint]
    months_common: int
    months_only_in_a: int
    months_only_in_b: int
    data_identical: bool


class PeriodDetailRow(BaseModel):
    sf_line_item_id: str
    sf_opportunity_id: str
    opportunity_name: str
    account_name: str
    business_line: str
    product_type: str
    consultant: str
    arr_a: JsonDecimal
    arr_b: JsonDecimal
    delta: JsonDecimal
    delta_pct: Optional[float]
    change_type: Literal["new", "removed", "modified", "unchanged"]


class PeriodDetailSummary(BaseModel):
    new: int
    removed: int
    modified: int
    unchanged: int
    total_delta: JsonDecimal


class PeriodDetailResponse(BaseModel):
    month: date
    rows: List[PeriodDetailRow]
    summary: PeriodDetailSummary


# ---------------------------------------------------------------------------
# ARR Summary
# ---------------------------------------------------------------------------

class ARRMonthPoint(BaseModel):
    month: date
    total_arr: JsonDecimal
    by_product_type: Dict[str, JsonDecimal]
    mom_change: Optional[JsonDecimal]
    mom_pct: Optional[float]


class ARRSummaryResponse(BaseModel):
    snapshot_id: UUID
    months: List[ARRMonthPoint]


# ---------------------------------------------------------------------------
# ARR by Consultant
# ---------------------------------------------------------------------------

class ConsultantARR(BaseModel):
    name: str
    country: str
    arr_total: JsonDecimal
    by_product_type: Dict[str, JsonDecimal]
    mom_change: Optional[JsonDecimal]
    mom_pct: Optional[float]


class ARRByConsultantResponse(BaseModel):
    snapshot_id: UUID
    month: date
    consultants: List[ConsultantARR]


# ---------------------------------------------------------------------------
# ARR Line Items
# ---------------------------------------------------------------------------

class ARRLineItemOut(BaseModel):
    id: UUID
    snapshot_id: UUID
    sf_opportunity_id: str
    sf_line_item_id: str
    opportunity_name: Optional[str]
    account_name: Optional[str]
    opportunity_owner: Optional[str]
    product_name: str
    product_type: Optional[str]
    is_saas: bool
    effective_start_date: date
    effective_end_date: date
    start_month: date
    end_month_normalized: date
    service_days: int
    real_price: Decimal
    annualized_value: Decimal
    consultant_country: Optional[str]
    data_quality_flags: List[str]
    used_start_fallback: bool
    used_end_fallback: bool
    excluded_from_arr: bool

    model_config = {"from_attributes": True}


class LineItemExcludePatch(BaseModel):
    excluded_from_arr: bool


class ARRLineItemsResponse(BaseModel):
    snapshot_id: UUID
    total: int
    page: int
    page_size: int
    items: List[ARRLineItemOut]


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertOut(BaseModel):
    id: UUID
    snapshot_id: UUID
    alert_type: str
    severity: str
    sf_opportunity_id: Optional[str]
    opportunity_name: Optional[str]
    account_name: Optional[str]
    product_name: Optional[str]
    description: str
    reviewed: bool
    review_note: Optional[str]
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
    arr_line_item_id: Optional[UUID]
    created_at: Optional[datetime]
    arr_impact: Optional[Decimal] = None
    # Grouping fields — count of raw alerts collapsed into this group
    occurrence_count: int = 1
    alert_ids: List[str] = Field(default_factory=list)
    reviewed_count: int = 0

    model_config = {"from_attributes": True}


class AlertPatch(BaseModel):
    reviewed: bool
    review_note: Optional[str] = None
    reviewed_by: Optional[str] = None


class BulkAlertPatch(BaseModel):
    alert_ids: List[str]
    reviewed: bool = True
    review_note: Optional[str] = None
    reviewed_by: Optional[str] = None


# ---------------------------------------------------------------------------
# Products (config)
# ---------------------------------------------------------------------------

class ProductOut(BaseModel):
    id: int
    product_name: str
    product_code: Optional[str]
    product_type: str
    category: Optional[str]
    subcategory: Optional[str]
    business_line: Optional[str]
    is_saas: bool

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    product_name: str
    product_code: Optional[str] = None
    product_type: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    business_line: Optional[str] = None


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    product_type: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    business_line: Optional[str] = None


# ---------------------------------------------------------------------------
# Consultants (config)
# ---------------------------------------------------------------------------

class ConsultantOut(BaseModel):
    id: int
    consultant_name: str
    country: str

    model_config = {"from_attributes": True}


class ConsultantUpdate(BaseModel):
    consultant_name: Optional[str] = None
    country: Optional[str] = None


# ---------------------------------------------------------------------------
# Stripe MRR
# ---------------------------------------------------------------------------

class StripeMRROut(BaseModel):
    month: date
    mrr: Decimal
    arr_equivalent: Decimal
    entered_by: Optional[str]
    entered_at: Optional[datetime]

    model_config = {"from_attributes": True}


class StripeMRRUpsert(BaseModel):
    snapshot_id: UUID
    month: date
    mrr: Decimal
    entered_by: Optional[str] = None


class StripeMRRBulkItem(BaseModel):
    month: date
    mrr: Decimal


class StripeMRRBulkUpsert(BaseModel):
    snapshot_id: UUID
    rows: List[StripeMRRBulkItem]
    entered_by: Optional[str] = None


class StripeMRRBulkResult(BaseModel):
    inserted: int
    updated: int
    rows: List[StripeMRROut]


# ---------------------------------------------------------------------------
# ARR by Account
# ---------------------------------------------------------------------------

class AccountARR(BaseModel):
    rank: int
    account_name: str
    total_arr: JsonDecimal
    by_month: Dict[str, JsonDecimal]   # "YYYY-MM-DD" → ARR
    first_month_arr: JsonDecimal
    last_month_arr: JsonDecimal
    delta: JsonDecimal


class ARRByAccountResponse(BaseModel):
    snapshot_id: UUID
    months: List[str]              # ordered list of months in range ("YYYY-MM-DD")
    accounts: List[AccountARR]     # top N, sorted by total_arr desc
    others: AccountARR             # sum of the rest (rank=0, account_name="Otros")
    total_arr: JsonDecimal         # grand total across all accounts and months


# ---------------------------------------------------------------------------
# Masters import
# ---------------------------------------------------------------------------

class MastersImportResponse(BaseModel):
    products_loaded: int
    consultants_loaded: int


# ---------------------------------------------------------------------------
# Gagero — Bridge Analysis
# ---------------------------------------------------------------------------

class BridgeItem(BaseModel):
    account_name: str
    product_type: str
    arr_a: JsonDecimal
    arr_b: JsonDecimal
    delta: JsonDecimal


class BridgeCategory(BaseModel):
    total_delta: JsonDecimal
    count: int
    items: List[BridgeItem]


class BridgeResponse(BaseModel):
    snapshot_id: UUID
    month_a: date
    month_b: date
    arr_a: JsonDecimal
    arr_b: JsonDecimal
    net_change: JsonDecimal
    net_change_pct: float
    new_logo: BridgeCategory
    churn: BridgeCategory
    up_selling: BridgeCategory
    down_selling: BridgeCategory
    unchanged_count: int


# ---------------------------------------------------------------------------
# Churn - Retention Analysis
# ---------------------------------------------------------------------------

class ChurnRatiosResponse(BaseModel):
    window: Literal["ltm", "ytd"]
    month_a: date
    month_b: date
    nrr: float
    grr: float
    logo_churn_rate: float
    churned_arr: JsonDecimal
    arr_cohort_start: JsonDecimal
    churned_logos: int
    total_logos: int
    churn_eur: JsonDecimal
    down_selling_eur: JsonDecimal
    up_selling_eur: JsonDecimal


class ChurnRollingPoint(BaseModel):
    month: date
    nrr: float
    grr: float
    churned_arr: JsonDecimal
    churned_logos: int


class ChurnRollingResponse(BaseModel):
    data: List[ChurnRollingPoint]
    window: Literal["ltm", "ytd"]


class ChurnedAccount(BaseModel):
    account_name: str
    product_type: str
    churn_month: date
    arr_lost: JsonDecimal


class ChurnedAccountsResponse(BaseModel):
    items: List[ChurnedAccount]
    total_arr_lost: JsonDecimal
    count: int


class ChurnByProductTypePoint(BaseModel):
    month: date
    by_product_type: Dict[str, JsonDecimal]
    total_churned_arr: JsonDecimal


class ChurnByProductTypeResponse(BaseModel):
    data: List[ChurnByProductTypePoint]


# ---------------------------------------------------------------------------
# Renewals - Forward-looking Monitor
# ---------------------------------------------------------------------------

class RenewalItem(BaseModel):
    account_name: str
    product_type: str
    consultant: Optional[str]
    current_arr: JsonDecimal
    expiry_month: date
    months_remaining: int
    is_renewed: bool
    renewal_arr: Optional[JsonDecimal]
    renewal_delta_pct: Optional[float]
    status: Literal["renewed", "at_risk"]


class RenewalSummary(BaseModel):
    at_risk_arr: JsonDecimal
    at_risk_count: int
    renewed_arr: JsonDecimal
    renewed_count: int
    horizon_months: int


class RenewalMonthPoint(BaseModel):
    month: date
    at_risk_arr: JsonDecimal
    renewed_arr: JsonDecimal
    at_risk_count: int
    renewed_count: int


class RenewalMonitorResponse(BaseModel):
    items: List[RenewalItem]
    summary: RenewalSummary
    by_month: List[RenewalMonthPoint]


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

class SyncRequest(BaseModel):
    triggered_by: Optional[str] = None
    notes: Optional[str] = None


class SyncResponse(BaseModel):
    snapshot_id: Optional[UUID] = None
    status: str
    records_processed: Optional[int] = None
    alerts_count: Optional[int] = None
    duration_seconds: Optional[float] = None
    skipped: bool = False
    skip_reason: Optional[str] = None

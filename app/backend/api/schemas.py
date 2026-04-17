"""Pydantic response/request schemas for the ARR Command Center API."""

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


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
# ARR Summary
# ---------------------------------------------------------------------------

class ARRMonthPoint(BaseModel):
    month: date
    total_arr: Decimal
    by_product_type: Dict[str, Decimal]
    mom_change: Optional[Decimal]
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
    arr_total: Decimal
    by_product_type: Dict[str, Decimal]
    mom_change: Optional[Decimal]
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

    model_config = {"from_attributes": True}


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
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AlertPatch(BaseModel):
    reviewed: bool
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


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

class SyncRequest(BaseModel):
    triggered_by: Optional[str] = None
    notes: Optional[str] = None


class SyncResponse(BaseModel):
    snapshot_id: UUID
    status: str
    records_processed: Optional[int]
    alerts_count: Optional[int]
    duration_seconds: Optional[float]

// Types derived from app/backend/api/schemas.py

export interface SnapshotSummary {
  id: string;
  created_at: string;
  sync_type: string;
  triggered_by: string | null;
  status: string;
  sf_records_fetched: number | null;
  sf_records_processed: number | null;
  alerts_count: number | null;
  unclassified_products_count: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

export interface ARRMonthPoint {
  month: string; // "YYYY-MM-DD"
  total_arr: number;
  by_product_type: Record<string, number>;
  mom_change: number | null;
  mom_pct: number | null;
}

export interface ARRSummaryResponse {
  snapshot_id: string;
  months: ARRMonthPoint[];
}

export interface ConsultantARR {
  name: string;
  country: string;
  arr_total: number;
  by_product_type: Record<string, number>;
  mom_change: number | null;
  mom_pct: number | null;
}

export interface ARRByConsultantResponse {
  snapshot_id: string;
  month: string;
  consultants: ConsultantARR[];
}

export interface ARRLineItemOut {
  id: string;
  snapshot_id: string;
  sf_opportunity_id: string;
  sf_line_item_id: string;
  opportunity_name: string | null;
  account_name: string | null;
  opportunity_owner: string | null;
  product_name: string;
  product_type: string | null;
  is_saas: boolean;
  effective_start_date: string;
  effective_end_date: string;
  start_month: string;
  end_month_normalized: string;
  service_days: number;
  real_price: number;
  annualized_value: number;
  consultant_country: string | null;
  data_quality_flags: string[];
  used_start_fallback: boolean;
  used_end_fallback: boolean;
}

export interface ARRLineItemsResponse {
  snapshot_id: string;
  total: number;
  page: number;
  page_size: number;
  items: ARRLineItemOut[];
}

export interface AlertOut {
  id: string;
  snapshot_id: string;
  alert_type: string;
  severity: string;
  sf_opportunity_id: string | null;
  opportunity_name: string | null;
  account_name: string | null;
  product_name: string | null;
  description: string;
  reviewed: boolean;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string | null;
}

export interface ProductOut {
  id: number;
  product_name: string;
  product_code: string | null;
  product_type: string;
  category: string | null;
  subcategory: string | null;
  business_line: string | null;
  is_saas: boolean;
}

export interface ConsultantOut {
  id: number;
  consultant_name: string;
  country: string;
}

export interface StripeMRROut {
  month: string;
  mrr: number;
  arr_equivalent: number;
  entered_by: string | null;
  entered_at: string | null;
}

export interface SyncResponse {
  snapshot_id: string;
  status: string;
  records_processed: number | null;
  alerts_count: number | null;
  duration_seconds: number | null;
}

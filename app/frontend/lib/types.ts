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

export interface SnapshotMeta {
  id: string;
  created_at: string;
  sync_type: string;
  notes: string | null;
}

export interface MonthlyTotalPoint {
  month: string;
  arr_a: number | null;
  arr_b: number | null;
}

export interface SnapshotComparisonTotals {
  snapshot_a: SnapshotMeta;
  snapshot_b: SnapshotMeta;
  data: MonthlyTotalPoint[];
  months_common: number;
  months_only_in_a: number;
  months_only_in_b: number;
  data_identical: boolean;
}

export type ChangeType = "new" | "removed" | "modified" | "unchanged";

export interface PeriodDetailRow {
  sf_line_item_id: string;
  sf_opportunity_id: string;
  opportunity_name: string;
  account_name: string;
  business_line: string;
  product_type: string;
  consultant: string;
  arr_a: number;
  arr_b: number;
  delta: number;
  delta_pct: number | null;
  change_type: ChangeType;
}

export interface PeriodDetailResponse {
  month: string;
  rows: PeriodDetailRow[];
  summary: {
    new: number;
    removed: number;
    modified: number;
    unchanged: number;
    total_delta: number;
  };
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
  excluded_from_arr: boolean;
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
  arr_line_item_id: string | null;
  created_at: string | null;
  arr_impact: number | null;
  occurrence_count: number;
  alert_ids: string[];
  reviewed_count: number;
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
  snapshot_id: string | null;
  status: string;
  records_processed: number | null;
  alerts_count: number | null;
  duration_seconds: number | null;
  skipped: boolean;
  skip_reason: string | null;
}

export interface MastersImportResponse {
  products_loaded: number;
  consultants_loaded: number;
}

export interface AccountARR {
  rank: number;
  account_name: string;
  total_arr: number;
  by_month: Record<string, number>; // "YYYY-MM-DD" → ARR
  first_month_arr: number;
  last_month_arr: number;
  delta: number;
}

export interface ARRByAccountResponse {
  snapshot_id: string;
  months: string[];            // ["YYYY-MM-DD", ...]
  accounts: AccountARR[];      // top N sorted by total_arr desc
  others: AccountARR;          // sum of remaining accounts
  total_arr: number;
}

export interface BridgeItem {
  account_name: string;
  product_type: string;
  arr_a: number;
  arr_b: number;
  delta: number;
}

export interface BridgeCategory {
  total_delta: number;
  count: number;
  items: BridgeItem[];
}

export interface BridgeResponse {
  snapshot_id: string;
  month_a: string;
  month_b: string;
  arr_a: number;
  arr_b: number;
  net_change: number;
  net_change_pct: number;
  new_logo: BridgeCategory;
  churn: BridgeCategory;
  up_selling: BridgeCategory;
  down_selling: BridgeCategory;
  unchanged_count: number;
}

export interface ChurnRatiosResponse {
  window: "ltm" | "ytd";
  month_a: string;
  month_b: string;
  nrr: number;
  grr: number;
  logo_churn_rate: number;
  churned_arr: number;
  arr_cohort_start: number;
  churned_logos: number;
  total_logos: number;
  churn_eur: number;
  down_selling_eur: number;
  up_selling_eur: number;
}

export interface ChurnRollingPoint {
  month: string;
  nrr: number;
  grr: number;
  churned_arr: number;
  churned_logos: number;
}

export interface ChurnRollingResponse {
  data: ChurnRollingPoint[];
  window: "ltm" | "ytd";
}

export interface ChurnedAccount {
  account_name: string;
  product_type: string;
  churn_month: string;
  arr_lost: number;
}

export interface ChurnedAccountsResponse {
  items: ChurnedAccount[];
  total_arr_lost: number;
  count: number;
}

export interface ChurnByProductTypePoint {
  month: string;
  by_product_type: Record<string, number>;
  total_churned_arr: number;
}

export interface ChurnByProductTypeResponse {
  data: ChurnByProductTypePoint[];
}

export type MonthlyChurnMovement = "churn" | "down_selling" | "up_selling" | "new_logo";

export interface MonthlyChurnItem {
  account_name: string;
  product_type: string;
  arr_previous: number;
  arr_current: number;
  delta: number;
  movement_type: MonthlyChurnMovement;
}

export interface MonthlyChurnSummary {
  month: string;
  previous_month: string;
  arr_start: number;
  arr_end_existing: number;
  new_logo_arr: number;
  churn_arr: number;
  down_selling_arr: number;
  up_selling_arr: number;
  net_existing_change: number;
  gross_arr_churn_rate: number;
  down_selling_rate: number;
  up_selling_rate: number;
  net_arr_churn_rate: number;
  grr: number;
  nrr: number;
  logo_churn_rate: number;
  churned_logos: number;
  total_logos_start: number;
}

export interface MonthlyChurnResponse extends MonthlyChurnSummary {
  items: MonthlyChurnItem[];
}

export interface MonthlyChurnTrendResponse {
  data: MonthlyChurnSummary[];
}

export type RenewalStatus = "renewed" | "at_risk";

export interface RenewalItem {
  account_name: string;
  product_type: string;
  consultant: string | null;
  current_arr: number;
  expiry_month: string;
  months_remaining: number;
  is_renewed: boolean;
  renewal_arr: number | null;
  renewal_delta_pct: number | null;
  status: RenewalStatus;
}

export interface RenewalSummary {
  at_risk_arr: number;
  at_risk_count: number;
  renewed_arr: number;
  renewed_count: number;
  horizon_months: number;
}

export interface RenewalMonthPoint {
  month: string;
  at_risk_arr: number;
  renewed_arr: number;
  at_risk_count: number;
  renewed_count: number;
}

export interface RenewalMonitorResponse {
  items: RenewalItem[];
  summary: RenewalSummary;
  by_month: RenewalMonthPoint[];
}

export interface ExpertResponseBlock {
  type: "text" | "table" | "chart";
  content?: string;
  table_title?: string;
  columns?: string[];
  rows?: string[][];
  chart_type?: "bar" | "line" | "area";
  chart_title?: string;
  chart_data?: Record<string, unknown>[];
  x_key?: string;
  data_keys?: string[];
  colors?: string[];
}

export interface ExpertChatResponse {
  blocks: ExpertResponseBlock[];
  tokens_used: number;
  model: string;
}

// ---------------------------------------------------------------------------
// Delta (Committed vs Real)
// ---------------------------------------------------------------------------

export interface DeltaMonthPoint {
  month: string;
  committed_arr: number;
  real_arr: number;
  delta_total: number;
  contracts_in_transit: number;
  delta_by_product_type: Record<string, number>;
}

export type TrendNote = "ascendente" | "descendente" | "estable" | "mixta";

export interface DeltaMonthlyTrendResponse {
  months: DeltaMonthPoint[];
  trend_note: TrendNote;
}

export interface DeltaContractItem {
  opportunity_name: string | null;
  account_name: string | null;
  product_type: string | null;
  arr_value: number;
  close_date: string;
  subscription_start_date: string | null;
  days_since_close: number;
}

export interface DeltaMonthBreakdownResponse {
  month: string;
  total_delta: number;
  contracts: DeltaContractItem[];
}

export interface BLDistributionStats {
  product_type: string;
  median_days: number;
  p75_days: number;
  p90_days: number;
  sample_size: number;
  is_reliable: boolean;
}

export interface ImplementationAlertItem {
  opportunity_name: string | null;
  account_name: string | null;
  product_type: string | null;
  arr_value: number;
  close_date: string;
  subscription_start_date: string | null;
  days_since_close: number;
  percentile_rank: number | null;
  bl_median_days: number;
  bl_p90_days: number;
  is_statistically_reliable: boolean;
}

export interface ImplementationAlertsResponse {
  alerts: ImplementationAlertItem[];
  bl_distributions: Record<string, BLDistributionStats>;
  total_contracts_in_transit: number;
  as_of_date: string;
}

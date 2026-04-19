import axios from "axios";
import type {
  ARRSummaryResponse,
  ARRByConsultantResponse,
  ARRLineItemsResponse,
  SnapshotSummary,
  AlertOut,
  ProductOut,
  ConsultantOut,
  StripeMRROut,
  SyncResponse,
} from "./types";

const client = axios.create({ baseURL: "/api" });

export const api = {
  // Snapshots
  getSnapshots: () =>
    client.get<SnapshotSummary[]>("/snapshots").then((r) => r.data),

  getSnapshot: (id: string) =>
    client.get<SnapshotSummary>(`/snapshots/${id}`).then((r) => r.data),

  // ARR
  getARRSummary: (params: {
    snapshot_id?: string;
    month_from?: string;
    month_to?: string;
    product_type?: string;
  }) =>
    client
      .get<ARRSummaryResponse>("/arr/summary", { params })
      .then((r) => r.data),

  getARRByConsultant: (params: {
    snapshot_id?: string;
    month: string;
    country?: string;
  }) =>
    client
      .get<ARRByConsultantResponse>("/arr/by-consultant", { params })
      .then((r) => r.data),

  getARRLineItems: (params: {
    snapshot_id?: string;
    is_saas?: boolean;
    product_type?: string;
    page?: number;
    page_size?: number;
  }) =>
    client
      .get<ARRLineItemsResponse>("/arr/line-items", { params })
      .then((r) => r.data),

  // Sync
  triggerSync: (data?: { triggered_by?: string; notes?: string }) =>
    client.post<SyncResponse>("/sync", data ?? {}).then((r) => r.data),

  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return client
      .post<SyncResponse>("/imports/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  // Alerts
  getAlerts: (params: { snapshot_id?: string; reviewed?: boolean; alert_type?: string }) =>
    client.get<AlertOut[]>("/alerts", { params }).then((r) => r.data),

  patchAlert: (id: string, data: { reviewed: boolean; review_note?: string; reviewed_by?: string }) =>
    client.patch<AlertOut>(`/alerts/${id}`, data).then((r) => r.data),

  // Config - Products
  getProducts: () =>
    client.get<ProductOut[]>("/config/products").then((r) => r.data),

  createProduct: (data: {
    product_name: string;
    product_code?: string;
    product_type: string;
    category?: string;
    subcategory?: string;
    business_line?: string;
  }) => client.post<ProductOut>("/config/products", data).then((r) => r.data),

  updateProduct: (id: number, data: Partial<{
    product_name: string;
    product_code: string;
    product_type: string;
    category: string;
    subcategory: string;
    business_line: string;
  }>) =>
    client.put<ProductOut>(`/config/products/${id}`, data).then((r) => r.data),

  // Config - Consultants
  getConsultants: () =>
    client.get<ConsultantOut[]>("/config/consultants").then((r) => r.data),

  updateConsultant: (id: number, data: Partial<{ consultant_name: string; country: string }>) =>
    client.put<ConsultantOut>(`/config/consultants/${id}`, data).then((r) => r.data),

  // Stripe MRR
  getStripeMRR: (params?: { snapshot_id?: string }) =>
    client.get<StripeMRROut[]>("/stripe-mrr", { params }).then((r) => r.data),

  upsertStripeMRR: (data: { snapshot_id: string; month: string; mrr: number; entered_by?: string }) =>
    client.put<StripeMRROut>("/stripe-mrr", data).then((r) => r.data),

  // Health
  health: () => client.get("/health").then((r) => r.data),
};

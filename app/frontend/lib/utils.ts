export function formatEUR(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMoM(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatEUR(value)}`;
}

export function formatMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("es-ES", {
    month: "short",
    year: "numeric",
  });
}

export function lastDayOfMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  const d = new Date(Number(year), Number(month), 0);
  return d.toISOString().slice(0, 10);
}

// Returns today's month as YYYY-MM-01
export function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSnapshotLabel(isoDateTime: string): string {
  return formatDateTime(isoDateTime);
}

export function snapshotStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    success: "Sincronización correcta",
    failed: "Sincronización fallida",
    partial: "Sincronización parcial",
  };
  return labels[status] ?? status;
}

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  "SaaS LMS": "#6366f1",
  "SaaS Skills": "#22c55e",
  "SaaS Author": "#f59e0b",
  "SaaS Engage": "#ec4899",
  "SaaS AIO": "#14b8a6",
  "Author Online": "#f97316",
  TaaS: "#8b5cf6",
  Implantacion: "#94a3b8",
  Otro: "#64748b",
};

export function productTypeColor(type: string): string {
  return PRODUCT_TYPE_COLORS[type] ?? "#94a3b8";
}

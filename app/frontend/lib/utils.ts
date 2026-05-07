export function formatEUR(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactEUR(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "-";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMoM(value: number | null | undefined): string {
  if (value == null) return "-";
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
    success: "Sincronizacion correcta",
    failed: "Sincronizacion fallida",
    partial: "Sincronizacion parcial",
  };
  return labels[status] ?? status;
}

import { PRODUCT_TYPE_COLORS } from "@/lib/constants";
import type { ARRMonthPoint } from "@/lib/types";

export function productTypeColor(type: string): string {
  return PRODUCT_TYPE_COLORS[type] ?? "#837a9f";
}

export function applyBLGrouping(
  byProductType: Record<string, number>,
  opts: { combineLmsAio: boolean; combineAuthor: boolean },
): Record<string, number> {
  const result = { ...byProductType };

  if (opts.combineLmsAio) {
    const lms = result["SaaS LMS"] ?? 0;
    const aio = result["SaaS AIO"] ?? 0;
    delete result["SaaS LMS"];
    delete result["SaaS AIO"];
    if (lms + aio > 0) result["LMS & AIO"] = lms + aio;
  }

  if (opts.combineAuthor) {
    const author = result["SaaS Author"] ?? 0;
    const online = result["Author Online"] ?? 0;
    delete result["SaaS Author"];
    delete result["Author Online"];
    if (author + online > 0) result["Author (Total)"] = author + online;
  }

  return result;
}

export function applyBLGroupingToMonths(
  months: ARRMonthPoint[],
  opts: { combineLmsAio: boolean; combineAuthor: boolean },
): ARRMonthPoint[] {
  return months.map((m) => ({
    ...m,
    by_product_type: applyBLGrouping(
      m.by_product_type as Record<string, number>,
      opts,
    ),
  }));
}

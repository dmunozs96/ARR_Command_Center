export function formatEUR(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
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
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMoM(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatEUR(value)}`;
}

export function calcYTD(
  months: ARRMonthPoint[],
  referenceMonth: string,
): number {
  const [refYear, refMonthNum] = referenceMonth.split("-").map(Number);
  return months
    .filter((p) => {
      const [y, m] = p.month.split("-").map(Number);
      return y === refYear && m <= refMonthNum;
    })
    .reduce((sum, p) => sum + (p.total_arr ?? 0), 0);
}

export function calcYTDByProductType(
  months: ARRMonthPoint[],
  referenceMonth: string,
  productType: string,
): number {
  const [refYear, refMonthNum] = referenceMonth.split("-").map(Number);
  return months
    .filter((p) => {
      const [y, m] = p.month.split("-").map(Number);
      return y === refYear && m <= refMonthNum;
    })
    .reduce((sum, p) => sum + ((p.by_product_type as Record<string, number>)[productType] ?? 0), 0);
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

// Suma dos series { month → value } haciendo join por clave de mes.
// Meses presentes en solo una de las series se rellenan con 0 en la otra.
export function sumSeriesByMonth(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    result[k] = (a[k] ?? 0) + (b[k] ?? 0);
  }
  return result;
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
    result["LMS & AIO"] = lms + aio;
  }

  if (opts.combineAuthor) {
    const author = result["SaaS Author"] ?? 0;
    const online = result["Author Online"] ?? 0;
    delete result["SaaS Author"];
    delete result["Author Online"];
    result["Author (Total)"] = author + online;
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

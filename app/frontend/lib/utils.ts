export function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function formatEUR(value: number | string | null | undefined): string {
  const numberValue = toFiniteNumber(value);
  if (numberValue === null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

export function formatCompactEUR(value: number | string): string {
  const numberValue = toFiniteNumber(value) ?? 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numberValue);
}

export function formatPct(value: number | string | null | undefined): string {
  const numberValue = toFiniteNumber(value);
  if (numberValue === null) return "—";
  const sign = numberValue >= 0 ? "+" : "";
  return `${sign}${numberValue.toFixed(1)}%`;
}

export function formatMoM(value: number | string | null | undefined): string {
  const numberValue = toFiniteNumber(value);
  if (numberValue === null) return "—";
  const sign = numberValue >= 0 ? "+" : "";
  return `${sign}${formatEUR(numberValue)}`;
}

export function findMonthPoint(
  months: ARRMonthPoint[],
  referenceMonth: string,
): ARRMonthPoint | undefined {
  const refKey = referenceMonth.slice(0, 7);
  return months.find((point) => point.month.startsWith(refKey));
}

export function monthARRValue(
  months: ARRMonthPoint[],
  referenceMonth: string,
): number | null {
  const point = findMonthPoint(months, referenceMonth);
  return point ? toFiniteNumber(point.total_arr) : null;
}

export function monthARRByProductType(
  months: ARRMonthPoint[],
  referenceMonth: string,
  productType: string,
): number | null {
  const point = findMonthPoint(months, referenceMonth);
  if (!point) return null;
  const value = (point.by_product_type as Record<string, number | string>)[productType];
  return toFiniteNumber(value) ?? 0;
}

export function previousYearSameMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  return `${year - 1}-${String(month).padStart(2, "0")}-01`;
}

export function previousDecember(referenceMonth: string): string {
  const [year] = referenceMonth.split("-").map(Number);
  return `${year - 1}-12-01`;
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
  a: Record<string, number | string>,
  b: Record<string, number | string>,
): Record<string, number> {
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    result[k] = (toFiniteNumber(a[k]) ?? 0) + (toFiniteNumber(b[k]) ?? 0);
  }
  return result;
}

export function applyBLGrouping(
  byProductType: Record<string, number | string>,
  opts: { combineLmsAio: boolean; combineAuthor: boolean },
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(byProductType)) {
    result[key] = toFiniteNumber(value) ?? 0;
  }

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
      m.by_product_type as Record<string, number | string>,
      opts,
    ),
  }));
}

export function productTypeFilterParams(
  value: string,
): { product_type?: string; product_types?: string } {
  if (value === "LMS & AIO") {
    return { product_types: "SaaS LMS,SaaS AIO" };
  }
  if (value === "Author (Total)") {
    return { product_types: "SaaS Author,Author Online" };
  }
  return value ? { product_type: value } : {};
}

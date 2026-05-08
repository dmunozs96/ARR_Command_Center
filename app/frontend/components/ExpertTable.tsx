"use client";

import type { ExpertResponseBlock } from "@/lib/types";

type Props = Pick<ExpertResponseBlock, "table_title" | "columns" | "rows">;

function isNumericColumn(column: string): boolean {
  const col = column.toLowerCase();
  return col.includes("arr") || col.includes("eur") || col.includes("mrr") || col.includes("total") || col.includes("delta");
}

function parseNumericCell(value: string): number | null {
  const normalized = value.replace(/[€]/g, "")
    .replace(/[€%\s]/g, "")
    .replace(/\((.*)\)/, "-$1")
    .trim();
  if (!normalized) return null;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  let decimalSeparator = "";
  if (lastComma > -1 && lastDot > -1) {
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else if (lastComma > -1) {
    const decimals = normalized.length - lastComma - 1;
    decimalSeparator = decimals > 0 && decimals <= 2 ? "," : "";
  } else if (lastDot > -1) {
    const decimals = normalized.length - lastDot - 1;
    decimalSeparator = decimals > 0 && decimals <= 2 ? "." : "";
  }

  const numeric =
    decimalSeparator === ","
      ? normalized.replace(/\./g, "").replace(",", ".")
      : decimalSeparator === "."
        ? normalized.replace(/,/g, "")
        : normalized.replace(/[.,]/g, "");
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCell(value: string, index: number, columns: string[]): string {
  // Try to format numeric cells as EUR if the column header hints at it
  const col = columns[index]?.toLowerCase() ?? "";
  const isMonetary = isNumericColumn(col);
  const numericValue = parseNumericCell(value);
  if (isMonetary && numericValue !== null) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(numericValue);
  }
  return value;
}

export function ExpertTable({ table_title, columns, rows }: Props) {
  if (!columns || !rows) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7e1f2] bg-white">
      {table_title && (
        <div className="flex items-center justify-between gap-3 border-b border-[#e7e1f2] bg-[#fbfaff] px-4 py-3">
          <p className="text-sm font-black text-[#2f185f]">{table_title}</p>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#837a9f]">
            {rows.length} filas
          </span>
        </div>
      )}
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f4f0fb]">
              {columns.map((col, i) => {
                const numeric = isNumericColumn(col);
                return (
                  <th
                    key={i}
                    className={`sticky top-0 bg-[#f4f0fb] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#6d35ff] ${
                      numeric ? "text-right" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#fbfaff]"}>
                {row.map((cell, ci) => {
                  const numeric = isNumericColumn(columns[ci] ?? "");
                  return (
                    <td
                      key={ci}
                      className={`px-4 py-2.5 align-top text-[#151229] ${numeric ? "text-right font-semibold tabular-nums" : ""}`}
                    >
                      {formatCell(String(cell ?? ""), ci, columns)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

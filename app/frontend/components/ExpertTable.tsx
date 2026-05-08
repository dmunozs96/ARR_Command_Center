"use client";

import type { ExpertResponseBlock } from "@/lib/types";

type Props = Pick<ExpertResponseBlock, "table_title" | "columns" | "rows">;

function isNumeric(str: string): boolean {
  return !isNaN(Number(str.replace(/[.,€%\s]/g, ""))) && str.trim() !== "";
}

function formatCell(value: string, index: number, columns: string[]): string {
  // Try to format numeric cells as EUR if the column header hints at it
  const col = columns[index]?.toLowerCase() ?? "";
  const isMonetary = col.includes("arr") || col.includes("eur") || col.includes("mrr") || col.includes("total") || col.includes("delta");
  if (isMonetary && isNumeric(value)) {
    const num = parseFloat(value.replace(/[.,\s]/g, ""));
    if (!isNaN(num)) {
      return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(num);
    }
  }
  return value;
}

export function ExpertTable({ table_title, columns, rows }: Props) {
  if (!columns || !rows) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7e1f2]">
      {table_title && (
        <div className="border-b border-[#e7e1f2] bg-[#fbfaff] px-4 py-3">
          <p className="text-sm font-black text-[#2f185f]">{table_title}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f4f0fb]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left text-xs font-black uppercase tracking-[0.12em] text-[#6d35ff]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#fbfaff]"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-[#151229]">
                    {formatCell(String(cell ?? ""), ci, columns)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

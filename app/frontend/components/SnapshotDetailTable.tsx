"use client";

import { Asterisk, Download, Equal, Minus, Plus } from "lucide-react";
import type { ChangeType, PeriodDetailResponse } from "@/lib/types";
import { formatEUR, formatPct } from "@/lib/utils";

interface Props {
  detail: PeriodDetailResponse | undefined;
  isLoading: boolean;
}

const STYLE_BY_CHANGE: Record<ChangeType, { label: string; className: string; icon: typeof Plus }> = {
  new: { label: "Nueva", className: "bg-green-50 text-green-700", icon: Plus },
  removed: { label: "Eliminada", className: "bg-red-50 text-red-700", icon: Minus },
  modified: { label: "Modificada", className: "bg-amber-50 text-amber-700", icon: Asterisk },
  unchanged: { label: "Sin cambio", className: "text-gray-500", icon: Equal },
};

function exportCsv(detail: PeriodDetailResponse) {
  const header = [
    "Cambio",
    "ID SF",
    "Oportunidad SF",
    "Oportunidad",
    "Cliente",
    "Linea",
    "Producto",
    "Consultor",
    "Snapshot A",
    "Snapshot B",
    "Delta",
    "Delta %",
  ];
  const rows = detail.rows.map((row) => [
    row.change_type,
    row.sf_line_item_id,
    row.sf_opportunity_id,
    row.opportunity_name,
    row.account_name,
    row.business_line,
    row.product_type,
    row.consultant,
    row.arr_a,
    row.arr_b,
    row.delta,
    row.delta_pct ?? "",
  ]);
  const content = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const url = window.URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `snapshot-review-${detail.month}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function SnapshotDetailTable({ detail, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-44 items-center justify-center rounded-2xl border border-[#e7e1f2] bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e7e1f2] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee8f8] px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-[#151229]">Cambios por line item</h2>
          <p className="text-xs text-[#6f6a80]">{detail.rows.length} filas visibles en el mes seleccionado</p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(detail)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e7e1f2] bg-white px-3 py-2 text-sm font-semibold text-[#2f185f] hover:bg-[#f7f3ff]"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1240px] w-full text-sm">
          <thead>
            <tr className="bg-[#fbfaff] text-left text-xs uppercase tracking-wide text-[#6f6a80]">
              <th className="px-4 py-3">Cambio</th>
              <th className="px-4 py-3">ID SF</th>
              <th className="px-4 py-3">Oportunidad SF</th>
              <th className="px-4 py-3">Oportunidad</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Linea</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Consultor</th>
              <th className="px-4 py-3 text-right">Snap A</th>
              <th className="px-4 py-3 text-right">Snap B</th>
              <th className="px-4 py-3 text-right">Delta</th>
              <th className="px-4 py-3 text-right">Delta %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee8f8]">
            {detail.rows.map((row) => {
              const style = STYLE_BY_CHANGE[row.change_type];
              const Icon = style.icon;
              return (
                <tr key={row.sf_line_item_id} className={style.className.split(" ")[0]}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-semibold ${style.className.split(" ").slice(1).join(" ")}`}>
                      <Icon size={14} />
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.sf_line_item_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.sf_opportunity_id}</td>
                  <td className="px-4 py-3 font-medium">{row.opportunity_name}</td>
                  <td className="px-4 py-3">{row.account_name}</td>
                  <td className="px-4 py-3">{row.business_line}</td>
                  <td className="px-4 py-3">{row.product_type}</td>
                  <td className="px-4 py-3">{row.consultant}</td>
                  <td className="px-4 py-3 text-right">{formatEUR(row.arr_a)}</td>
                  <td className="px-4 py-3 text-right">{formatEUR(row.arr_b)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.delta >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatEUR(row.delta)}
                  </td>
                  <td className={`px-4 py-3 text-right ${row.delta >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatPct(row.delta_pct)}
                  </td>
                </tr>
              );
            })}
            {detail.rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-[#837a9f]">
                  No hay filas que cumplan el filtro actual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#eee8f8] px-5 py-4 text-sm font-semibold text-[#2f185f]">
        {detail.summary.new} nuevas | {detail.summary.removed} eliminadas | {detail.summary.modified} modificadas |{" "}
        {detail.summary.unchanged} sin cambios | Delta total: {formatEUR(detail.summary.total_delta)}
      </p>
    </section>
  );
}

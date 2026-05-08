"use client";

import { formatEUR, formatPct } from "@/lib/utils";
import type { ARRByAccountResponse } from "@/lib/types";

interface Props {
  data: ARRByAccountResponse | undefined;
  isLoading: boolean;
}

const CHART_COLORS = [
  "#6d35ff", "#20c7a8", "#ff5f57", "#ffb020", "#c83cff", "#3557ff",
  "#00a7d8", "#f97316", "#84cc16", "#ec4899", "#14b8a6", "#a855f7",
  "#ef4444", "#0ea5e9", "#22c55e", "#eab308", "#6366f1", "#f43f5e",
  "#8b5cf6", "#06b6d4",
];

function accountColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function downloadCSV(data: ARRByAccountResponse) {
  const months = data.months;
  const header = ["Rank", "Cliente", ...months.map((m) => m.slice(0, 7)), "ARR Actual", "Δ EUR", "Δ %"];
  const rows = [...data.accounts, data.others].map((acct) => {
    const firstVal = acct.by_month[months[0]] ?? null;
    const lastVal = acct.by_month[months[months.length - 1]] ?? null;
    const absChange = firstVal !== null && lastVal !== null ? lastVal - firstVal : null;
    const pctChange = firstVal && firstVal !== 0 && absChange !== null
      ? (absChange / firstVal) * 100
      : null;
    return [
      acct.rank === 0 ? "Otros" : String(acct.rank),
      acct.account_name,
      ...months.map((m) => String(acct.by_month[m] ?? 0)),
      String(lastVal ?? 0),
      absChange !== null ? String(absChange) : "",
      pctChange !== null ? pctChange.toFixed(1) : "",
    ];
  });
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes_arr.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientARRTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="h-[520px] animate-pulse rounded-3xl border border-[#e7e1f2] bg-white p-5">
        <div className="h-5 w-48 rounded bg-[#e4dcf1]" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-2xl bg-[#f4f0fb]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
        Sin datos para los filtros seleccionados.
      </div>
    );
  }

  const { months, accounts, others } = data;

  function renderRow(
    acct: (typeof accounts)[0],
    idx: number,
    isOthers = false,
  ) {
    const firstVal = months.length > 0 ? (acct.by_month[months[0]] ?? null) : null;
    const lastVal = months.length > 0 ? (acct.by_month[months[months.length - 1]] ?? null) : null;

    const absChange =
      firstVal !== null && lastVal !== null ? lastVal - firstVal : null;
    const pctChange =
      firstVal && firstVal !== 0 && absChange !== null
        ? (absChange / firstVal) * 100
        : null;

    const deltaColor =
      absChange == null
        ? "text-[#837a9f]"
        : absChange >= 0
          ? "text-[#0c8f76]"
          : "text-[#d03932]";

    return (
      <tr
        key={acct.account_name}
        className={`transition hover:bg-[#fbfaff] ${isOthers ? "bg-[#f9f7ff] text-[#6f6a80]" : ""}`}
      >
        <td className="sticky left-0 bg-white px-4 py-3">
          {isOthers ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#e5e7eb] text-xs font-black text-[#6f6a80]">
              +
            </span>
          ) : (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black text-white"
              style={{ backgroundColor: accountColor(idx) }}
            >
              {acct.rank}
            </span>
          )}
        </td>
        <td
          className={`sticky left-8 bg-white px-4 py-3 font-bold min-w-[160px] max-w-[220px] truncate ${isOthers ? "" : "text-[#151229]"}`}
        >
          {acct.account_name}
        </td>
        {months.map((m) => {
          const val = acct.by_month[m] ?? 0;
          return (
            <td key={m} className="px-3 py-3 text-right text-[#6f6a80]">
              {val > 0 ? formatEUR(val) : <span className="text-[#d1cde8]">—</span>}
            </td>
          );
        })}
        <td className="px-4 py-3 text-right font-black text-[#151229]">
          <strong>{formatEUR(lastVal ?? 0)}</strong>
        </td>
        <td className={`px-4 py-3 text-right font-bold ${deltaColor}`}>
          <span>{formatEUR(absChange)}</span>
          <br />
          <span className="text-xs text-[#837a9f]">
            {pctChange !== null ? formatPct(pctChange) : "—"}
          </span>
        </td>
      </tr>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="flex items-center justify-between border-b border-[#eee8f8] px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Top clientes</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">ARR por cuenta</h2>
        </div>
        <button
          onClick={() => downloadCSV(data)}
          className="rounded-xl bg-[#efe9ff] px-3 py-2 text-xs font-black text-[#2f185f] transition hover:bg-[#6d35ff] hover:text-white"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fbfaff] text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
              <th className="sticky left-0 bg-[#fbfaff] px-4 py-3 text-left">#</th>
              <th className="sticky left-8 bg-[#fbfaff] px-4 py-3 text-left min-w-[160px]">Cliente</th>
              {months.map((m) => (
                <th key={m} className="px-3 py-3 text-right whitespace-nowrap">
                  {m.slice(0, 7)}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-black text-[#2f185f]">ARR Actual</th>
              <th className="px-4 py-3 text-right">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ebf8]">
            {accounts.map((acct, idx) => renderRow(acct, idx))}
            {renderRow(others, 0, true)}
          </tbody>
          <tfoot>
            <tr className="bg-[#2f185f] font-black text-white">
              <td className="px-4 py-4" colSpan={2}>TOTAL</td>
              {months.map((m) => {
                const total = [...accounts, others].reduce(
                  (sum, a) => sum + (a.by_month[m] ?? 0),
                  0,
                );
                return (
                  <td key={m} className="px-3 py-4 text-right">{formatEUR(total)}</td>
                );
              })}
              <td className="px-4 py-4 text-right">{formatEUR(data.total_arr)}</td>
              <td className="px-4 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

"use client";

import type { BridgeResponse } from "@/lib/types";
import { formatEUR } from "@/lib/utils";

interface Props {
  data: BridgeResponse;
}

function pct(value: number, base: number): string {
  if (!base) return "—";
  return `${(value / base >= 0 ? "+" : "")}${((value / base) * 100).toFixed(1)}%`;
}

function DeltaCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <td
      className={`px-4 py-3 text-right font-bold ${positive ? "text-[#22c55e]" : "text-[#ef4444]"}`}
    >
      {positive ? "+" : ""}
      {formatEUR(value)}
    </td>
  );
}

export function GageroSummaryTable({ data }: Props) {
  const rows = [
    {
      label: "New Logo",
      count: data.new_logo.count,
      delta: data.new_logo.total_delta,
      color: "#22c55e",
    },
    {
      label: "Churn",
      count: data.churn.count,
      delta: data.churn.total_delta,
      color: "#ef4444",
    },
    {
      label: "Up Selling",
      count: data.up_selling.count,
      delta: data.up_selling.total_delta,
      color: "#6d35ff",
    },
    {
      label: "Down Selling",
      count: data.down_selling.count,
      delta: data.down_selling.total_delta,
      color: "#f97316",
    },
  ];

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)] overflow-hidden">
      <div className="p-5 pb-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Resumen</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Tabla de drivers</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e7e1f2] bg-[#fbfaff]">
            <th className="px-4 py-3 text-left font-bold text-[#6f6a80] uppercase tracking-wide text-xs">Driver</th>
            <th className="px-4 py-3 text-right font-bold text-[#6f6a80] uppercase tracking-wide text-xs">N.º Cuentas×BL</th>
            <th className="px-4 py-3 text-right font-bold text-[#6f6a80] uppercase tracking-wide text-xs">ARR Total</th>
            <th className="px-4 py-3 text-right font-bold text-[#6f6a80] uppercase tracking-wide text-xs">% sobre ARR_A</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#f4f0fb]">
              <td className="px-4 py-3 font-semibold text-[#2f185f] flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                {row.label}
              </td>
              <td className="px-4 py-3 text-right text-[#6f6a80]">{row.count}</td>
              <DeltaCell value={row.delta} />
              <td className="px-4 py-3 text-right text-[#6f6a80]">{pct(row.delta, data.arr_a)}</td>
            </tr>
          ))}
          <tr className="bg-[#f7f3ff]">
            <td className="px-4 py-3 font-black text-[#2f185f]">Net change</td>
            <td className="px-4 py-3 text-right text-[#6f6a80]">—</td>
            <DeltaCell value={data.net_change} />
            <td className="px-4 py-3 text-right font-bold text-[#2f185f]">
              {data.net_change >= 0 ? "+" : ""}
              {(data.net_change_pct * 100).toFixed(1)}%
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

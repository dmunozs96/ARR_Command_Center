"use client";

import { formatEUR, formatPct, formatMoM, productTypeColor } from "@/lib/utils";
import type { ARRMonthPoint } from "@/lib/types";

interface Props {
  current: ARRMonthPoint | undefined;
  prev: ARRMonthPoint | undefined;
  loading: boolean;
}

export function ARRBreakdownTable({ current, prev, loading }: Props) {
  if (loading) {
    return (
      <div className="h-96 animate-pulse rounded-3xl border border-[#e7e1f2] bg-white p-5">
        <div className="h-5 w-48 rounded bg-[#e4dcf1]" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-2xl bg-[#f4f0fb]" />
          ))}
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
        Sin datos para el mes seleccionado.
      </div>
    );
  }

  const types = Object.entries(current.by_product_type).sort(([, a], [, b]) => b - a);
  const total = current.total_arr;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="border-b border-[#eee8f8] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">
          Mix de negocio
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">
          Desglose por linea
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-[#fbfaff] text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
              <th className="px-5 py-3 text-left">Linea</th>
              <th className="px-4 py-3 text-right">ARR actual</th>
              <th className="px-4 py-3 text-right">MoM EUR</th>
              <th className="px-4 py-3 text-right">MoM %</th>
              <th className="px-5 py-3 text-left">Peso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ebf8]">
            {types.map(([type, arr]) => {
              const prevArr = prev?.by_product_type[type] ?? null;
              const momChange = prevArr != null ? arr - prevArr : null;
              const momPct = prevArr != null && prevArr > 0 ? ((arr - prevArr) / prevArr) * 100 : null;
              const pctTotal = total > 0 ? (arr / total) * 100 : 0;
              return (
                <tr key={type} className="transition hover:bg-[#fbfaff]">
                  <td className="px-5 py-4 font-black text-[#151229]">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: productTypeColor(type) }} />
                    {type}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-[#151229]">{formatEUR(arr)}</td>
                  <td className={`px-4 py-4 text-right font-bold ${momChange == null ? "text-[#837a9f]" : momChange >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}`}>
                    {formatMoM(momChange)}
                  </td>
                  <td className={`px-4 py-4 text-right font-bold ${momPct == null ? "text-[#837a9f]" : momPct >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}`}>
                    {formatPct(momPct)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#efe9ff]">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pctTotal, 100)}%`, backgroundColor: productTypeColor(type) }} />
                      </div>
                      <span className="w-12 text-right font-bold text-[#6f6a80]">{pctTotal.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#2f185f] font-black text-white">
              <td className="px-5 py-4">TOTAL</td>
              <td className="px-4 py-4 text-right">{formatEUR(total)}</td>
              <td className="px-4 py-4 text-right">{formatMoM(current.mom_change)}</td>
              <td className="px-4 py-4 text-right">{formatPct(current.mom_pct)}</td>
              <td className="px-5 py-4 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

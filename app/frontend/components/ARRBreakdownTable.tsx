"use client";

import {
  applyBLGrouping,
  applyBLGroupingToMonths,
  formatEUR,
  formatPct,
  monthARRByProductType,
  previousDecember,
  previousYearSameMonth,
  productTypeColor,
  toFiniteNumber,
} from "@/lib/utils";
import { useBLGrouping } from "@/lib/bl-grouping-context";
import type { ARRMonthPoint } from "@/lib/types";

interface Props {
  current: ARRMonthPoint | undefined;
  months: ARRMonthPoint[];
  loading: boolean;
}

export function ARRBreakdownTable({ current, months, loading }: Props) {
  const { combineLmsAio, combineAuthor } = useBLGrouping();
  const groupOpts = { combineLmsAio, combineAuthor };

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

  const groupedMonths = applyBLGroupingToMonths(months, groupOpts);
  const groupedCurrent = applyBLGrouping(
    current.by_product_type as Record<string, number>,
    groupOpts,
  );

  const currentMonthRef = current.month;
  const [currYear] = currentMonthRef.split("-").map(Number);
  const prevYearRef = previousYearSameMonth(currentMonthRef);
  const prevDecemberRef = previousDecember(currentMonthRef);
  const prevDecemberLabel = prevDecemberRef.slice(0, 7);

  const types = Object.entries(groupedCurrent).sort(([, a], [, b]) => b - a);
  const total = toFiniteNumber(current.total_arr) ?? 0;
  const totalPrevYear = types.reduce((sum, [type]) => sum + (monthValue(prevYearRef, type) ?? 0), 0);
  const totalPrevDecember = types.reduce((sum, [type]) => sum + (monthValue(prevDecemberRef, type) ?? 0), 0);
  const totalYoyPct = totalPrevYear > 0 ? ((total - totalPrevYear) / totalPrevYear) * 100 : null;
  const totalDecemberPct = totalPrevDecember > 0 ? ((total - totalPrevDecember) / totalPrevDecember) * 100 : null;

  function monthValue(referenceMonth: string, type: string): number | null {
    return monthARRByProductType(groupedMonths, referenceMonth, type);
  }

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
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="bg-[#fbfaff] text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
              <th className="px-5 py-3 text-left">Linea</th>
              <th className="px-4 py-3 text-right">ARR actual</th>
              <th className="px-4 py-3 text-right">Mismo mes {currYear - 1}</th>
              <th className="px-4 py-3 text-right">Δ YoY %</th>
              <th className="px-4 py-3 text-right">Dic {currYear - 1}</th>
              <th className="px-4 py-3 text-right">Δ vs Dic %</th>
              <th className="px-5 py-3 text-left">Peso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ebf8]">
            {types.map(([type, arr]) => {
              const prevYearValue = monthValue(prevYearRef, type);
              const prevDecemberValue = monthValue(prevDecemberRef, type);
              const yoyPct = prevYearValue && prevYearValue > 0 ? ((arr - prevYearValue) / prevYearValue) * 100 : null;
              const decemberPct = prevDecemberValue && prevDecemberValue > 0 ? ((arr - prevDecemberValue) / prevDecemberValue) * 100 : null;
              const pctTotal = total > 0 ? (arr / total) * 100 : 0;
              return (
                <tr key={type} className="transition hover:bg-[#fbfaff]">
                  <td className="px-5 py-4 font-black text-[#151229]">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: productTypeColor(type) }}
                    />
                    {type}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-[#151229]">
                    {formatEUR(arr)}
                  </td>
                  <td className="px-4 py-4 text-right text-[#837a9f]">
                    {formatEUR(prevYearValue)}
                  </td>
                  <td className={`px-4 py-4 text-right font-bold ${deltaClass(yoyPct)}`}>
                    {formatPct(yoyPct)}
                  </td>
                  <td className="px-4 py-4 text-right text-[#837a9f]">
                    {formatEUR(prevDecemberValue)}
                  </td>
                  <td className={`px-4 py-4 text-right font-bold ${deltaClass(decemberPct)}`}>
                    {formatPct(decemberPct)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#efe9ff]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(pctTotal, 100)}%`,
                            backgroundColor: productTypeColor(type),
                          }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-[#6f6a80]">
                        {pctTotal.toFixed(1)}%
                      </span>
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
              <td className="px-4 py-4 text-right">{formatEUR(totalPrevYear)}</td>
              <td className="px-4 py-4 text-right">{formatPct(totalYoyPct)}</td>
              <td className="px-4 py-4 text-right">{formatEUR(totalPrevDecember)}</td>
              <td className="px-4 py-4 text-right">{formatPct(totalDecemberPct)}</td>
              <td className="px-5 py-4 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="border-t border-[#eee8f8] px-5 py-3 text-xs font-semibold text-[#837a9f]">
        Referencia de cierre: {prevDecemberLabel}. ARR es anualizado, por eso las comparativas son punto a punto y no acumuladas.
      </p>
    </section>
  );
}

function deltaClass(value: number | null): string {
  if (value == null) return "text-[#837a9f]";
  return value >= 0 ? "text-[#0c8f76]" : "text-[#d03932]";
}

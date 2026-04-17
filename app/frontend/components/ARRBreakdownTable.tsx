"use client";

import { formatEUR, formatPct, formatMoM } from "@/lib/utils";
import type { ARRMonthPoint } from "@/lib/types";

interface Props {
  current: ARRMonthPoint | undefined;
  prev: ARRMonthPoint | undefined;
  loading: boolean;
}

export function ARRBreakdownTable({ current, prev, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-gray-400 text-sm">
        Sin datos para el mes seleccionado.
      </div>
    );
  }

  const types = Object.entries(current.by_product_type).sort(
    ([, a], [, b]) => b - a
  );
  const total = current.total_arr;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">
          Desglose por línea de negocio
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-2.5">Línea</th>
              <th className="text-right px-4 py-2.5">ARR Actual</th>
              <th className="text-right px-4 py-2.5">MoM (€)</th>
              <th className="text-right px-4 py-2.5">MoM (%)</th>
              <th className="text-right px-5 py-2.5">% Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {types.map(([type, arr]) => {
              const prevArr = prev?.by_product_type[type] ?? null;
              const momChange = prevArr != null ? arr - prevArr : null;
              const momPct =
                prevArr != null && prevArr > 0
                  ? ((arr - prevArr) / prevArr) * 100
                  : null;
              const pctTotal = total > 0 ? (arr / total) * 100 : 0;
              return (
                <tr key={type} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{type}</td>
                  <td className="text-right px-4 py-2.5 text-gray-900">
                    {formatEUR(arr)}
                  </td>
                  <td
                    className={`text-right px-4 py-2.5 ${
                      momChange == null
                        ? "text-gray-400"
                        : momChange >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatMoM(momChange)}
                  </td>
                  <td
                    className={`text-right px-4 py-2.5 ${
                      momPct == null
                        ? "text-gray-400"
                        : momPct >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatPct(momPct)}
                  </td>
                  <td className="text-right px-5 py-2.5 text-gray-500">
                    {pctTotal.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="px-5 py-2.5 text-gray-900">TOTAL</td>
              <td className="text-right px-4 py-2.5 text-gray-900">
                {formatEUR(total)}
              </td>
              <td
                className={`text-right px-4 py-2.5 ${
                  (current.mom_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatMoM(current.mom_change)}
              </td>
              <td
                className={`text-right px-4 py-2.5 ${
                  (current.mom_pct ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPct(current.mom_pct)}
              </td>
              <td className="text-right px-5 py-2.5 text-gray-500">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

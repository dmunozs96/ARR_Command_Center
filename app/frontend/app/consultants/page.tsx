"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEUR, formatPct, formatMoM } from "@/lib/utils";

function currentMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ConsultantsPage() {
  const [month] = useState(currentMonthISO);
  const [country, setCountry] = useState("");
  const [sortBy, setSortBy] = useState<"arr_total" | "name" | "mom_change">("arr_total");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: snapshots } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });
  const latestSnapshot = snapshots?.[0];

  const { data, isLoading } = useQuery({
    queryKey: ["consultants", latestSnapshot?.id, month, country],
    queryFn: () =>
      api.getARRByConsultant({
        snapshot_id: latestSnapshot?.id,
        month,
        country: country || undefined,
      }),
    enabled: !!latestSnapshot,
  });

  const consultants = [...(data?.consultants ?? [])].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "mom_change") return (b.mom_change ?? 0) - (a.mom_change ?? 0);
    return b.arr_total - a.arr_total;
  });

  const countries = Array.from(
    new Set((data?.consultants ?? []).map((c) => c.country))
  ).filter(Boolean).sort();

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ARR por Consultor</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">País</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                {[
                  { key: "name", label: "Consultor" },
                  { key: "arr_total", label: "ARR Total" },
                  { key: "mom_change", label: "MoM (€)" },
                  { key: null, label: "MoM (%)" },
                  { key: null, label: "País" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={`text-left px-4 py-2.5 ${key ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    onClick={() => key && setSortBy(key as typeof sortBy)}
                  >
                    {label}
                    {key && sortBy === key && " ↓"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </td>
                  </tr>
                ))}
              {!isLoading &&
                consultants.map((c) => (
                  <>
                    <tr
                      key={c.name}
                      className="hover:bg-indigo-50 cursor-pointer"
                      onClick={() =>
                        setExpandedRow(expandedRow === c.name ? null : c.name)
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        <span className="mr-1.5 text-gray-400">
                          {expandedRow === c.name ? "▾" : "▸"}
                        </span>
                        {c.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{formatEUR(c.arr_total)}</td>
                      <td
                        className={`px-4 py-2.5 ${
                          (c.mom_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatMoM(c.mom_change)}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          (c.mom_pct ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatPct(c.mom_pct)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{c.country}</td>
                    </tr>
                    {expandedRow === c.name &&
                      Object.entries(c.by_product_type)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, arr]) => (
                          <tr key={`${c.name}-${type}`} className="bg-indigo-50">
                            <td className="pl-10 pr-4 py-1.5 text-gray-500 text-xs">
                              › {type}
                            </td>
                            <td className="px-4 py-1.5 text-gray-700 text-xs">
                              {formatEUR(arr)}
                            </td>
                            <td colSpan={3} />
                          </tr>
                        ))}
                  </>
                ))}
              {!isLoading && consultants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Sin datos para este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

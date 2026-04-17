"use client";

import { formatEUR, formatPct, formatMoM } from "@/lib/utils";
import type { ARRMonthPoint } from "@/lib/types";

interface Props {
  current: ARRMonthPoint | undefined;
  loading: boolean;
}

export function KPICards({ current, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const arr = current?.total_arr ?? 0;
  const mom = current?.mom_change ?? null;
  const momPct = current?.mom_pct ?? null;

  const cards = [
    {
      label: "ARR Actual",
      value: formatEUR(arr),
      sub: null,
      color: "text-gray-900",
    },
    {
      label: "MoM (€)",
      value: mom != null ? formatMoM(mom) : "—",
      sub: null,
      color: mom == null ? "text-gray-400" : mom >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "MoM (%)",
      value: formatPct(momPct),
      sub: null,
      color: momPct == null ? "text-gray-400" : momPct >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

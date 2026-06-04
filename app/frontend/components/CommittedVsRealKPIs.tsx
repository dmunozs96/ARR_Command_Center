"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { DeltaMonthPoint } from "@/lib/types";
import { formatCompactEUR } from "@/lib/utils";

interface Props {
  current: DeltaMonthPoint;
  previous: DeltaMonthPoint | null;
  weightedAvgDays: number;
}

export function CommittedVsRealKPIs({ current, previous, weightedAvgDays }: Props) {
  const deltaChange = previous ? current.delta_total - previous.delta_total : null;
  const deltaUp = deltaChange !== null && deltaChange > 0;
  const deltaDown = deltaChange !== null && deltaChange < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Delta actual */}
      <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
          Delta actual
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-black text-[#2f185f]">
            {formatCompactEUR(current.delta_total)}
          </span>
          {deltaChange !== null && (
            <span
              className={`mb-1 flex items-center gap-0.5 text-sm font-semibold ${
                deltaUp ? "text-[#f97316]" : deltaDown ? "text-[#22c55e]" : "text-[#9ca3af]"
              }`}
            >
              {deltaUp ? <ArrowUp size={14} /> : deltaDown ? <ArrowDown size={14} /> : null}
              {formatCompactEUR(Math.abs(deltaChange))}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[#6f6a80]">ARR firmado pendiente de activar</p>
      </div>

      {/* Contratos en tránsito */}
      <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
          Contratos en tránsito
        </p>
        <div className="mt-2">
          <span className="text-3xl font-black text-[#2f185f]">
            {current.contracts_in_transit}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#6f6a80]">contratos firmados sin iniciar</p>
      </div>

      {/* Tiempo medio de espera */}
      <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
          Tiempo medio de espera
        </p>
        <div className="mt-2">
          <span className="text-3xl font-black text-[#2f185f]">
            {Math.round(weightedAvgDays)}
          </span>
          <span className="ml-1 text-lg font-semibold text-[#6f6a80]">días</span>
        </div>
        <p className="mt-1 text-xs text-[#6f6a80]">media ponderada por ARR</p>
      </div>
    </div>
  );
}

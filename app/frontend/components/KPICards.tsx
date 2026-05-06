"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Gauge, LineChart, TrendingUp } from "lucide-react";
import { formatEUR, formatPct, formatMoM } from "@/lib/utils";
import type { ARRMonthPoint } from "@/lib/types";

interface Props {
  current: ARRMonthPoint | undefined;
  loading: boolean;
  unreviewedCount?: number;
  monthsCount?: number;
}

function trendClass(value: number | null | undefined): string {
  if (value == null) return "text-[#837a9f] bg-[#f4f0fb]";
  return value >= 0 ? "text-[#0c8f76] bg-[#e9fbf7]" : "text-[#d03932] bg-[#fff0ef]";
}

function TrendIcon({ value }: { value: number | null | undefined }) {
  if (value == null) return <Gauge size={18} />;
  return value >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />;
}

export function KPICards({ current, loading, unreviewedCount = 0, monthsCount = 0 }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl border border-[#e7e1f2] bg-white p-5">
            <div className="h-4 w-28 rounded bg-[#eee8f8]" />
            <div className="mt-8 h-8 w-40 rounded bg-[#e4dcf1]" />
            <div className="mt-5 h-3 w-32 rounded bg-[#f2eef8]" />
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
      label: "ARR actual",
      value: formatEUR(arr),
      detail: "Revenue anualizado en el mes seleccionado",
      icon: TrendingUp,
      accent: "bg-[#6d35ff]",
    },
    {
      label: "Variacion MoM",
      value: mom != null ? formatMoM(mom) : "-",
      detail: "Cambio absoluto frente al mes anterior",
      icon: LineChart,
      accent: mom == null || mom >= 0 ? "bg-[#20c7a8]" : "bg-[#ff5f57]",
    },
    {
      label: "Crecimiento MoM",
      value: formatPct(momPct),
      detail: "Tasa mensual de expansion o contraccion",
      icon: Gauge,
      accent: momPct == null || momPct >= 0 ? "bg-[#20c7a8]" : "bg-[#ff5f57]",
    },
    {
      label: "Calidad de dato",
      value: `${unreviewedCount}`,
      detail: `${monthsCount} meses en el periodo filtrado`,
      icon: AlertTriangle,
      accent: unreviewedCount > 0 ? "bg-[#ffb020]" : "bg-[#20c7a8]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const valueForTrend = index === 1 ? mom : index === 2 ? momPct : null;
        return (
          <article
            key={card.label}
            className="group rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(49,24,95,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
                  {card.label}
                </p>
                <p className="mt-4 text-3xl font-black tracking-tight text-[#151229]">
                  {card.value}
                </p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white ${card.accent}`}>
                <Icon size={21} strokeWidth={2.4} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm leading-5 text-[#6f6a80]">{card.detail}</p>
              {index > 0 && index < 3 && (
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${trendClass(valueForTrend)}`}>
                  <TrendIcon value={valueForTrend} />
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

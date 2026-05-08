"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Gauge, LineChart, TrendingUp } from "lucide-react";
import { calcYTD, formatEUR, formatPct, formatMoM } from "@/lib/utils";
import type { ARRMonthPoint } from "@/lib/types";

interface Props {
  current: ARRMonthPoint | undefined;
  months: ARRMonthPoint[];
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

function findYoyMonth(months: ARRMonthPoint[], currentMonth: string): ARRMonthPoint | undefined {
  const [year, month] = currentMonth.split("-");
  const yoyYear = Number(year) - 1;
  const prefix = `${yoyYear}-${month}`;
  return months.find((m) => m.month.startsWith(prefix));
}

export function KPICards({ current, months, loading, unreviewedCount = 0, monthsCount = 0 }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
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

  const yoyMonth = current ? findYoyMonth(months, current.month) : undefined;
  const yoy = yoyMonth != null ? Number(current!.total_arr) - Number(yoyMonth.total_arr) : null;
  const yoyPct =
    yoy != null && yoyMonth != null && Number(yoyMonth.total_arr) !== 0
      ? (yoy / Number(yoyMonth.total_arr)) * 100
      : null;

  const currentMonthRef = current?.month ?? "";
  const [currYear] = currentMonthRef.split("-").map(Number);
  const prevYearRef = currentMonthRef
    ? `${currYear - 1}-${currentMonthRef.split("-")[1]}-01`
    : "";

  const ytdCurrent = currentMonthRef ? calcYTD(months, currentMonthRef) : null;
  const ytdPrev = prevYearRef ? calcYTD(months, prevYearRef) : null;
  const ytdDeltaPct =
    ytdCurrent != null && ytdPrev != null && ytdPrev > 0
      ? ((ytdCurrent - ytdPrev) / ytdPrev) * 100
      : null;

  const cards = [
    {
      label: "ARR actual",
      value: formatEUR(Number(arr)),
      detail: "Revenue anualizado en el mes seleccionado",
      icon: TrendingUp,
      accent: "bg-[#6d35ff]",
      trendValue: null as number | null,
    },
    {
      label: `YTD ${currYear || ""}`,
      value: ytdCurrent != null ? formatEUR(ytdCurrent) : "—",
      detail: "Suma acumulada de ARR desde enero del año en curso",
      icon: LineChart,
      accent: "bg-[#20c7a8]",
      trendValue: null as number | null,
    },
    {
      label: `YTD ${(currYear || 1) - 1}`,
      value: ytdPrev != null ? formatEUR(ytdPrev) : "—",
      detail: "Suma acumulada de ARR en el mismo periodo del año anterior",
      icon: Gauge,
      accent: "bg-[#20c7a8]",
      trendValue: null as number | null,
    },
    {
      label: "Calidad de dato",
      value: `${unreviewedCount}`,
      detail: `${monthsCount} meses en el periodo filtrado`,
      icon: AlertTriangle,
      accent: unreviewedCount > 0 ? "bg-[#ffb020]" : "bg-[#20c7a8]",
      trendValue: null as number | null,
    },
    {
      label: "Variacion YoY",
      value: yoy != null ? formatMoM(yoy) : "—",
      detail: "Cambio absoluto frente al mismo mes del año anterior",
      icon: LineChart,
      accent: yoy == null || yoy >= 0 ? "bg-[#6d35ff]" : "bg-[#ff5f57]",
      trendValue: yoy,
    },
    {
      label: "Δ YTD %",
      value: formatPct(ytdDeltaPct),
      detail: "Variacion del acumulado YTD frente al año anterior",
      icon: Gauge,
      accent: ytdDeltaPct == null || ytdDeltaPct >= 0 ? "bg-[#6d35ff]" : "bg-[#ff5f57]",
      trendValue: ytdDeltaPct,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
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
              {card.trendValue !== null && (
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${trendClass(card.trendValue)}`}>
                  <TrendIcon value={card.trendValue} />
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

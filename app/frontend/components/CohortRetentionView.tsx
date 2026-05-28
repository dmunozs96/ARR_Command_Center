"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { ChurnByBLChart } from "@/components/ChurnByBLChart";
import { ChurnRollingChart } from "@/components/ChurnRollingChart";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import type { ChurnRatiosResponse } from "@/lib/types";
import { formatEUR, formatMonth, productTypeFilterParams } from "@/lib/utils";

type RetentionWindow = "ltm" | "ytd";

function subMonths(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const result = new Date(year, month - 1 - amount, 1);
  return result.toISOString().slice(0, 10);
}

function moveMonth(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const result = new Date(year, month - 1 + amount, 1);
  return result.toISOString().slice(0, 10);
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function rateColor(value: number, goodWhenLow = true): string {
  if (goodWhenLow) return value <= 1 ? "text-[#0c8f76]" : value <= 2.5 ? "text-[#c08000]" : "text-[#d03932]";
  return value >= 100 ? "text-[#0c8f76]" : value >= 90 ? "text-[#c08000]" : "text-[#d03932]";
}

function CohortKpis({ data }: { data: ChurnRatiosResponse }) {
  const cards = [
    { label: "Cohort NRR", value: pct(data.nrr), className: rateColor(data.nrr, false) },
    { label: "Cohort GRR", value: pct(data.grr), className: rateColor(data.grr, false) },
    { label: "Logo churn cohorte", value: pct(data.logo_churn_rate), className: rateColor(data.logo_churn_rate) },
    { label: "ARR churneado cohorte", value: formatEUR(data.churned_arr), className: "text-[#d03932]" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <section key={card.label} className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">{card.label}</p>
          <p className={`mt-3 text-3xl font-black tracking-tight ${card.className}`}>{card.value}</p>
        </section>
      ))}
    </div>
  );
}

export function CohortRetentionView() {
  const { monthTo, productType, accountName } = useAnalysisFilters();
  const { activeSnapshot } = useSnapshotContext();
  const [selectedMonthOverride, setSelectedMonthOverride] = useState<string | null>(null);
  const [retentionWindow, setRetentionWindow] = useState<RetentionWindow>("ltm");
  const selectedMonth = selectedMonthOverride ?? monthTo;
  const commonParams = {
    snapshot_id: activeSnapshot?.id,
    ...productTypeFilterParams(productType),
    account_name: accountName || undefined,
  };

  const ratiosQuery = useQuery({
    queryKey: ["churn-ratios", activeSnapshot?.id, selectedMonth, retentionWindow, productType, accountName],
    queryFn: () => api.getChurnRatios({ ...commonParams, month_b: selectedMonth, window: retentionWindow }),
    enabled: !!activeSnapshot,
  });
  const rollingQuery = useQuery({
    queryKey: ["churn-rolling", activeSnapshot?.id, selectedMonth, retentionWindow, productType, accountName],
    queryFn: () => api.getChurnRolling({ ...commonParams, month_to: selectedMonth, window: retentionWindow }),
    enabled: !!activeSnapshot,
  });
  const byProductQuery = useQuery({
    queryKey: ["churn-by-product", activeSnapshot?.id, selectedMonth, productType, accountName],
    queryFn: () =>
      api.getChurnByProductType({
        ...commonParams,
        month_from: subMonths(selectedMonth, 11),
        month_to: selectedMonth,
      }),
    enabled: !!activeSnapshot,
  });

  const ratios = ratiosQuery.data;

  return (
    <>
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
              <CalendarRange size={15} />
              Mes de medicion
            </span>
            <input
              type="month"
              value={selectedMonth.slice(0, 7)}
              onChange={(event) => setSelectedMonthOverride(`${event.target.value}-01`)}
              className="h-11 rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonthOverride(moveMonth(selectedMonth, -1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0fb] text-[#6d35ff] transition hover:bg-[#efe9ff]"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonthOverride(moveMonth(selectedMonth, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0fb] text-[#6d35ff] transition hover:bg-[#efe9ff]"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {!activeSnapshot && (
        <div className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
          Selecciona un snapshot para analizar retencion.
        </div>
      )}

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Ventana de cohorte</p>
        <div className="flex flex-wrap items-center gap-2">
          {(["ltm", "ytd"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setRetentionWindow(value)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                retentionWindow === value ? "bg-[#6d35ff] text-white" : "bg-[#f4f0fb] text-[#6d35ff]"
              }`}
            >
              {value.toUpperCase()}
            </button>
          ))}
          {ratios && (
            <p className="ml-3 text-sm font-semibold text-[#6f6a80]">
              Cohorte: {formatMonth(ratios.month_a)} -&gt; {formatMonth(ratios.month_b)}
            </p>
          )}
        </div>
      </section>

      {ratiosQuery.isLoading && activeSnapshot && (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
        </div>
      )}

      {ratiosQuery.isError && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
          No se han podido calcular las metricas de cohorte para el periodo seleccionado.
        </div>
      )}

      {ratios && !ratiosQuery.isError && ratios.total_logos === 0 && (
        <div className="rounded-3xl border border-[#fde68a] bg-[#fffbeb] p-6 text-sm font-semibold text-[#92400e]">
          No hay datos suficientes para calcular {retentionWindow.toUpperCase()} en el periodo seleccionado.
        </div>
      )}

      {ratios && !ratiosQuery.isError && ratios.total_logos > 0 && (
        <>
          <CohortKpis data={ratios} />
          <div className="rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] p-4 text-sm text-[#6f6a80]">
            Cohort inicial: <strong className="text-[#2f185f]">{formatEUR(ratios.arr_cohort_start)}</strong>
            {" | "}Churn: {formatEUR(ratios.churn_eur)}
            {" | "}Down Selling: {formatEUR(ratios.down_selling_eur)}
            {" | "}Up Selling: {formatEUR(ratios.up_selling_eur)}
          </div>
          {rollingQuery.isLoading ? (
            <div className="flex h-[300px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
            </div>
          ) : (
            <ChurnRollingChart data={rollingQuery.data?.data ?? []} />
          )}
          {byProductQuery.isLoading ? (
            <div className="flex h-[300px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
            </div>
          ) : (
            <ChurnByBLChart data={byProductQuery.data?.data ?? []} />
          )}
        </>
      )}
    </>
  );
}

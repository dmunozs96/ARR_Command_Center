"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, ChevronLeft, ChevronRight, Info, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useARRMode } from "@/lib/arr-mode-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import type { MonthlyChurnItem, MonthlyChurnResponse, MonthlyChurnSummary } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth, productTypeFilterParams } from "@/lib/utils";

type ComparisonMode = "mom" | "qoq" | "ytd" | "ltm" | "yoy" | "free";

const MOVEMENT_LABELS: Record<MonthlyChurnItem["movement_type"], string> = {
  churn: "Churn",
  down_selling: "Down Selling",
  up_selling: "Up Selling",
  new_logo: "New Logo",
};

const MOVEMENT_COLORS: Record<MonthlyChurnItem["movement_type"], string> = {
  churn: "text-[#d03932]",
  down_selling: "text-[#f97316]",
  up_selling: "text-[#0c8f76]",
  new_logo: "text-[#0c8f76]",
};

const MODE_LABELS: Record<ComparisonMode, string> = {
  mom: "Intermensual",
  qoq: "Intertrimestral",
  ytd: "YTD",
  ltm: "LTM",
  yoy: "YoY",
  free: "Libre",
};

function subMonths(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const result = new Date(year, month - 1 - amount, 1);
  return result.toISOString().slice(0, 10);
}

function yearStart(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-01-01`;
}

function applyMode(mode: ComparisonMode, monthTo: string): { from: string; to: string } | null {
  switch (mode) {
    case "mom": return { from: subMonths(monthTo, 1), to: monthTo };
    case "qoq": return { from: subMonths(monthTo, 3), to: monthTo };
    case "ytd": return { from: yearStart(monthTo), to: monthTo };
    case "ltm": return { from: subMonths(monthTo, 12), to: monthTo };
    case "yoy": return { from: subMonths(monthTo, 12), to: monthTo };
    case "free": return null;
  }
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function signedEUR(value: number): string {
  return `${value >= 0 ? "+" : "-"}${formatEUR(Math.abs(value))}`;
}

function rateColor(value: number, goodWhenLow = true): string {
  if (goodWhenLow) return value <= 1 ? "text-[#0c8f76]" : value <= 2.5 ? "text-[#c08000]" : "text-[#d03932]";
  return value >= 100 ? "text-[#0c8f76]" : value >= 90 ? "text-[#c08000]" : "text-[#d03932]";
}

function moveMonth(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const result = new Date(year, month - 1 + amount, 1);
  return result.toISOString().slice(0, 10);
}

function MonthlyKpis({ data }: { data: MonthlyChurnResponse }) {
  const cards = [
    {
      label: "ARR perdido por bajas",
      value: pct(data.gross_arr_churn_rate),
      detail: `${formatEUR(data.churn_arr)} de ${formatEUR(data.arr_start)}`,
      legend: "Clientes x linea de negocio que estaban activos el mes anterior y ahora tienen ARR cero. Es el churn puro para modelar.",
      className: rateColor(data.gross_arr_churn_rate),
    },
    {
      label: "ARR erosionado por downsell",
      value: pct(data.down_selling_rate),
      detail: `${formatEUR(data.down_selling_arr)} reducidos`,
      legend: "Clientes x linea de negocio que siguen activos, pero con menos ARR que el mes anterior. No es baja, es deterioro.",
      className: rateColor(data.down_selling_rate),
    },
    {
      label: "Retencion neta de cartera",
      value: pct(data.nrr),
      detail: `${signedEUR(data.net_existing_change)} en base existente`,
      legend: "Base existente despues de bajas, downsell y upsell. No incluye New Logo, para no tapar problemas de retencion.",
      className: rateColor(data.nrr, false),
    },
    {
      label: "Clientes x BL perdidos",
      value: pct(data.logo_churn_rate),
      detail: `${data.churned_logos} de ${data.total_logos_start} activos iniciales`,
      legend: "Cuenta cada combinacion cliente-linea que desaparece. No equivale a cliente legal si conserva otra linea de negocio.",
      className: rateColor(data.logo_churn_rate),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <section key={card.label} className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">{card.label}</p>
          <p className={`mt-3 text-3xl font-black tracking-tight ${card.className}`}>{card.value}</p>
          <p className="mt-2 text-sm font-semibold text-[#6f6a80]">{card.detail}</p>
          <p className="mt-3 border-t border-[#f0ebf8] pt-3 text-xs leading-5 text-[#6f6a80]">{card.legend}</p>
        </section>
      ))}
    </div>
  );
}

function MonthlyBridge({ data }: { data: MonthlyChurnResponse }) {
  const finalArr = data.arr_end_existing + data.new_logo_arr;
  const totalData = [
    { name: "ARR inicial", value: data.arr_start, fill: "#2f185f" },
    { name: "ARR final", value: finalArr, fill: "#6d35ff" },
  ];
  const movementData = [
    { name: "Churn", value: -data.churn_arr, fill: "#d03932" },
    { name: "Downsell", value: -data.down_selling_arr, fill: "#f97316" },
    { name: "Upsell", value: data.up_selling_arr, fill: "#0c8f76" },
    { name: "New Logo", value: data.new_logo_arr, fill: "#22c55e" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Puente ARR total</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">
              {formatMonth(data.previous_month)} -&gt; {formatMonth(data.month)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6f6a80]">
              Parte del ARR completo, incluyendo Author Online, y cierra contra el ARR final del periodo.
            </p>
          </div>
          <div className="text-right text-sm font-semibold text-[#6f6a80]">
            Variacion neta: <span className="font-black text-[#2f185f]">{signedEUR(finalArr - data.arr_start)}</span>
            <br />
            ARR final: <span className="font-black text-[#2f185f]">{formatEUR(finalArr)}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={totalData} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 700 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              formatter={(value) => [formatEUR(Number(value)), "ARR"]}
              labelStyle={{ color: "#151229", fontWeight: 800 }}
              contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {totalData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Drivers de variacion</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6f6a80]">
          Churn no se aplica a Author Online; su variacion se refleja como upsell o downsell neto.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={movementData} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 700 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              formatter={(value) => [signedEUR(Number(value)), "ARR"]}
              labelStyle={{ color: "#151229", fontWeight: 800 }}
              contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {movementData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

function MonthlyTrend({ data }: { data: MonthlyChurnSummary[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }));

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Tendencia mensual</p>
          <p className="mt-1 text-sm font-semibold text-[#6f6a80]">Evolucion de bajas, downsell y retencion neta de cartera.</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 22, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
          />
          <Line type="monotone" dataKey="gross_arr_churn_rate" name="ARR perdido por bajas" stroke="#d03932" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="down_selling_rate" name="ARR erosionado por downsell" stroke="#f97316" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="nrr" name="Retencion neta de cartera" stroke="#6d35ff" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

function MonthlyDetailTable({ items }: { items: MonthlyChurnItem[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="border-b border-[#e7e1f2] p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Detalle mensual</p>
        <p className="mt-1 text-sm font-semibold text-[#6f6a80]">{items.length} movimientos en la base del mes</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#fbfaff] text-left text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
            <tr>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Linea de negocio</th>
              <th className="px-5 py-3">Movimiento</th>
              <th className="px-5 py-3 text-right">ARR previo</th>
              <th className="px-5 py-3 text-right">ARR actual</th>
              <th className="px-5 py-3 text-right">Delta</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr className="border-t border-[#f0ebf8]">
                <td className="px-5 py-6 text-center font-semibold text-[#837a9f]" colSpan={6}>
                  No hay churn, downsell, upsell o new logo en el mes seleccionado.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={`${item.account_name}-${item.product_type}-${item.movement_type}`} className="border-t border-[#f0ebf8]">
                  <td className="px-5 py-3 font-semibold text-[#2f185f]">{item.account_name}</td>
                  <td className="px-5 py-3 text-[#6f6a80]">{item.product_type}</td>
                  <td className={`px-5 py-3 font-bold ${MOVEMENT_COLORS[item.movement_type]}`}>{MOVEMENT_LABELS[item.movement_type]}</td>
                  <td className="px-5 py-3 text-right text-[#6f6a80]">{formatEUR(item.arr_previous)}</td>
                  <td className="px-5 py-3 text-right text-[#6f6a80]">{formatEUR(item.arr_current)}</td>
                  <td className={`px-5 py-3 text-right font-bold ${item.delta >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}`}>
                    {signedEUR(item.delta)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ChurnPage() {
  const { monthTo, productType, accountName } = useAnalysisFilters();
  const { arrMode } = useARRMode();
  const { activeSnapshot } = useSnapshotContext();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("mom");
  const [selectedMonthOverride, setSelectedMonthOverride] = useState<string | null>(null);
  const [freeMonthFrom, setFreeMonthFrom] = useState<string>(() => subMonths(monthTo, 1));
  const [freeMonthTo, setFreeMonthTo] = useState<string>(monthTo);
  const selectedMonth = selectedMonthOverride ?? monthTo;
  const calculatedPeriod = applyMode(comparisonMode, selectedMonth);
  const monthFrom = calculatedPeriod?.from ?? freeMonthFrom;
  const monthB = calculatedPeriod?.to ?? freeMonthTo;
  const productFilters = productTypeFilterParams(productType);
  const commonParams = {
    snapshot_id: activeSnapshot?.id,
    ...productFilters,
    account_name: accountName || undefined,
    mode: arrMode,
  };

  const monthlyQuery = useQuery({
    queryKey: ["churn-monthly", activeSnapshot?.id, monthFrom, monthB, productType, accountName, arrMode],
    queryFn: () => api.getChurnMonthly({ ...commonParams, month: monthB, month_from: monthFrom }),
    enabled: !!activeSnapshot && !!monthFrom && !!monthB && monthFrom !== monthB,
  });
  const monthlyTrendQuery = useQuery({
    queryKey: ["churn-monthly-trend", activeSnapshot?.id, monthB, productType, accountName, arrMode],
    queryFn: () =>
      api.getChurnMonthlyTrend({
        ...commonParams,
        month_from: subMonths(monthB, 11),
        month_to: monthB,
      }),
    enabled: !!activeSnapshot && !!monthB,
  });
  const monthly = monthlyQuery.data;

  return (
    <main className="flex-1 space-y-6 p-6" data-testid="churn-page">
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0ef] text-[#d03932]">
            <TrendingDown size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Retencion de ingresos</p>
            <h1 className="text-2xl font-black tracking-tight text-[#151229]">Churn</h1>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#6f6a80]">
          <Info size={14} />
          Vista de retencion sobre ARR completo. Author Online se incluye en el puente, pero no se clasifica como churn.
        </p>
      </header>

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
              <CalendarRange size={15} />
              Periodo de analisis
            </span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MODE_LABELS) as ComparisonMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    if (mode === "free" && comparisonMode !== "free") {
                      setFreeMonthFrom(monthFrom);
                      setFreeMonthTo(monthB);
                    }
                    setComparisonMode(mode);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    comparisonMode === mode
                      ? "bg-[#6d35ff] text-white"
                      : "bg-[#f4f0fb] text-[#6d35ff] hover:bg-[#efe9ff]"
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
              Mes de llegada
            </span>
            <input
              type="month"
              value={monthB.slice(0, 7)}
              disabled={comparisonMode === "free"}
              onChange={(event) => setSelectedMonthOverride(`${event.target.value}-01`)}
              className="h-11 rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10 disabled:text-[#837a9f]"
            />
          </label>
          {comparisonMode === "free" && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">Salida</span>
                <input
                  type="month"
                  value={freeMonthFrom.slice(0, 7)}
                  onChange={(event) => setFreeMonthFrom(`${event.target.value}-01`)}
                  className="h-11 rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">Llegada</span>
                <input
                  type="month"
                  value={freeMonthTo.slice(0, 7)}
                  onChange={(event) => setFreeMonthTo(`${event.target.value}-01`)}
                  className="h-11 rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
                />
              </label>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMonth = moveMonth(monthB, -1);
                if (comparisonMode === "free") {
                  setFreeMonthTo(nextMonth);
                } else {
                  setSelectedMonthOverride(nextMonth);
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0fb] text-[#6d35ff] transition hover:bg-[#efe9ff]"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                const nextMonth = moveMonth(monthB, 1);
                if (comparisonMode === "free") {
                  setFreeMonthTo(nextMonth);
                } else {
                  setSelectedMonthOverride(nextMonth);
                }
              }}
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

      {monthlyQuery.isLoading && activeSnapshot && (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
        </div>
      )}

      {monthlyQuery.isError && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
          No se han podido calcular las metricas mensuales de churn para el periodo seleccionado.
        </div>
      )}

      {monthly && !monthlyQuery.isError && (
        <>
          <section className="rounded-3xl border border-[#e7e1f2] bg-[#fbfaff] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">KPIs de negocio</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-[#151229]">Lectura de {formatMonth(monthly.month)}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6f6a80]">
                  Todos los porcentajes se calculan sobre el ARR completo al inicio del periodo: {formatEUR(monthly.arr_start)}.
                </p>
              </div>
              <p className="text-sm font-semibold text-[#6f6a80]">
                New Logo del mes, fuera de retencion: <span className="text-[#0c8f76]">{formatEUR(monthly.new_logo_arr)}</span>
              </p>
            </div>
          </section>

          <MonthlyKpis data={monthly} />

          <MonthlyBridge data={monthly} />

          <div>
            {monthlyTrendQuery.isLoading ? (
              <div className="flex h-[300px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
              </div>
            ) : (
              <MonthlyTrend data={monthlyTrendQuery.data?.data ?? []} />
            )}
          </div>

          <MonthlyDetailTable items={monthly.items} />
        </>
      )}
    </main>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info, TrendingDown } from "lucide-react";
import { ChurnByBLChart } from "@/components/ChurnByBLChart";
import { ChurnRollingChart } from "@/components/ChurnRollingChart";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import type { ChurnRatiosResponse, MonthlyChurnItem, MonthlyChurnResponse, MonthlyChurnSummary } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth, productTypeFilterParams } from "@/lib/utils";

type RetentionWindow = "ltm" | "ytd";

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

function subMonths(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const result = new Date(year, month - 1 - amount, 1);
  return result.toISOString().slice(0, 10);
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function signedPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function signedEUR(value: number): string {
  return `${value >= 0 ? "+" : "-"}${formatEUR(Math.abs(value))}`;
}

function rateColor(value: number, goodWhenLow = true): string {
  if (goodWhenLow) return value <= 1 ? "text-[#0c8f76]" : value <= 2.5 ? "text-[#c08000]" : "text-[#d03932]";
  return value >= 100 ? "text-[#0c8f76]" : value >= 90 ? "text-[#c08000]" : "text-[#d03932]";
}

function MonthlyKpis({ data }: { data: MonthlyChurnResponse }) {
  const cards = [
    {
      label: "Gross ARR Churn",
      value: pct(data.gross_arr_churn_rate),
      detail: `${formatEUR(data.churn_arr)} perdidos`,
      className: rateColor(data.gross_arr_churn_rate),
    },
    {
      label: "Net ARR Churn",
      value: signedPct(data.net_arr_churn_rate),
      detail: signedEUR(data.net_existing_change),
      className: data.net_arr_churn_rate <= 0 ? "text-[#0c8f76]" : rateColor(data.net_arr_churn_rate),
    },
    {
      label: "Logo Churn",
      value: pct(data.logo_churn_rate),
      detail: `${data.churned_logos} de ${data.total_logos_start} cuentas x BL`,
      className: rateColor(data.logo_churn_rate),
    },
    {
      label: "NRR mensual",
      value: pct(data.nrr),
      detail: `GRR ${pct(data.grr)}`,
      className: rateColor(data.nrr, false),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <section key={card.label} className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">{card.label}</p>
          <p className={`mt-3 text-3xl font-black tracking-tight ${card.className}`}>{card.value}</p>
          <p className="mt-2 text-sm font-semibold text-[#6f6a80]">{card.detail}</p>
        </section>
      ))}
    </div>
  );
}

function MonthlyBridge({ data }: { data: MonthlyChurnResponse }) {
  const chartData = [
    { name: "ARR inicial", value: data.arr_start, fill: "#2f185f" },
    { name: "Churn", value: -data.churn_arr, fill: "#d03932" },
    { name: "Downsell", value: -data.down_selling_arr, fill: "#f97316" },
    { name: "Upsell", value: data.up_selling_arr, fill: "#0c8f76" },
    { name: "New Logo", value: data.new_logo_arr, fill: "#22c55e" },
  ];

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Puente mensual</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">
            {formatMonth(data.previous_month)} -&gt; {formatMonth(data.month)}
          </h2>
        </div>
        <div className="text-right text-sm font-semibold text-[#6f6a80]">
          ARR final base existente: <span className="font-black text-[#2f185f]">{formatEUR(data.arr_end_existing)}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 700 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
          <Tooltip
            formatter={(value) => [signedEUR(Number(value)), "ARR"]}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

function MonthlyTrend({ data }: { data: MonthlyChurnSummary[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }));

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Tasas modelables</p>
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
          <Line type="monotone" dataKey="gross_arr_churn_rate" name="Gross ARR churn" stroke="#d03932" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="net_arr_churn_rate" name="Net ARR churn" stroke="#6d35ff" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="logo_churn_rate" name="Logo churn" stroke="#9ca3af" strokeDasharray="6 5" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
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
  const { activeSnapshot } = useSnapshotContext();
  const [retentionWindow, setRetentionWindow] = useState<RetentionWindow>("ltm");
  const productFilters = productTypeFilterParams(productType);
  const commonParams = {
    snapshot_id: activeSnapshot?.id,
    ...productFilters,
    account_name: accountName || undefined,
  };

  const monthlyQuery = useQuery({
    queryKey: ["churn-monthly", activeSnapshot?.id, monthTo, productType, accountName],
    queryFn: () => api.getChurnMonthly({ ...commonParams, month: monthTo }),
    enabled: !!activeSnapshot,
  });
  const monthlyTrendQuery = useQuery({
    queryKey: ["churn-monthly-trend", activeSnapshot?.id, monthTo, productType, accountName],
    queryFn: () =>
      api.getChurnMonthlyTrend({
        ...commonParams,
        month_from: subMonths(monthTo, 11),
        month_to: monthTo,
      }),
    enabled: !!activeSnapshot,
  });
  const ratiosQuery = useQuery({
    queryKey: ["churn-ratios", activeSnapshot?.id, monthTo, retentionWindow, productType, accountName],
    queryFn: () => api.getChurnRatios({ ...commonParams, month_b: monthTo, window: retentionWindow }),
    enabled: !!activeSnapshot,
  });
  const rollingQuery = useQuery({
    queryKey: ["churn-rolling", activeSnapshot?.id, monthTo, retentionWindow, productType, accountName],
    queryFn: () => api.getChurnRolling({ ...commonParams, month_to: monthTo, window: retentionWindow }),
    enabled: !!activeSnapshot,
  });
  const byProductQuery = useQuery({
    queryKey: ["churn-by-product", activeSnapshot?.id, monthTo, productType, accountName],
    queryFn: () =>
      api.getChurnByProductType({
        ...commonParams,
        month_from: subMonths(monthTo, 11),
        month_to: monthTo,
      }),
    enabled: !!activeSnapshot,
  });

  const monthly = monthlyQuery.data;
  const ratios = ratiosQuery.data;

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
          Vista mensual para modelar y vista de cohorte para retencion historica. Excluye Author Online (Stripe).
        </p>
      </header>

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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Modelo mensual</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-[#151229]">{formatMonth(monthly.month)}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6f6a80]">
                  Tasas sobre ARR activo al inicio del mes: {formatEUR(monthly.arr_start)}.
                </p>
              </div>
              <p className="text-sm font-semibold text-[#6f6a80]">
                Net base existente: <span className={monthly.net_existing_change >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}>{signedEUR(monthly.net_existing_change)}</span>
              </p>
            </div>
          </section>

          <MonthlyKpis data={monthly} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <MonthlyBridge data={monthly} />
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

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Retencion de cohorte</p>
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
    </main>
  );
}

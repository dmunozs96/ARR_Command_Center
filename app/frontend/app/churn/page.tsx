"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, TrendingDown } from "lucide-react";
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

function metricColor(kind: "nrr" | "grr" | "logo", value: number): string {
  if (kind === "nrr") return value > 100 ? "text-[#0c8f76]" : value >= 90 ? "text-[#c08000]" : "text-[#d03932]";
  if (kind === "grr") return value > 90 ? "text-[#0c8f76]" : value >= 80 ? "text-[#c08000]" : "text-[#d03932]";
  return value <= 5 ? "text-[#0c8f76]" : value <= 10 ? "text-[#c08000]" : "text-[#d03932]";
}

function KpiCards({ data }: { data: ChurnRatiosResponse }) {
  const cards = [
    { label: "NRR", value: `${data.nrr.toFixed(1)}%`, className: metricColor("nrr", data.nrr) },
    { label: "GRR", value: `${data.grr.toFixed(1)}%`, className: metricColor("grr", data.grr) },
    { label: "Logo Churn Rate", value: `${data.logo_churn_rate.toFixed(1)}%`, className: metricColor("logo", data.logo_churn_rate) },
    { label: "ARR Churneado", value: `-${formatEUR(data.churned_arr)}`, className: "text-[#d03932]" },
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
  const accountsQuery = useQuery({
    queryKey: ["churn-accounts", activeSnapshot?.id, monthTo, retentionWindow, productType, accountName],
    queryFn: () => api.getChurnedAccounts({ ...commonParams, month_b: monthTo, window: retentionWindow }),
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

  const ratios = ratiosQuery.data;
  const initialLoading = ratiosQuery.isLoading && !!activeSnapshot;
  const hasBlockingError = ratiosQuery.isError;
  const hasSupportingError = rollingQuery.isError || accountsQuery.isError || byProductQuery.isError;

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
          Excluye Author Online (Stripe). Analisis basado en contratos Salesforce SaaS.
        </p>
      </header>

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Ventana de retencion</p>
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
              Periodo: {formatMonth(ratios.month_a)} -&gt; {formatMonth(ratios.month_b)}
            </p>
          )}
        </div>
      </section>

      {!activeSnapshot && (
        <div className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
          Selecciona un snapshot para analizar retencion.
        </div>
      )}

      {initialLoading && (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
        </div>
      )}

      {hasBlockingError && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
          No se han podido calcular las metricas de churn para el periodo seleccionado.
        </div>
      )}

      {hasSupportingError && ratios && (
        <div className="rounded-3xl border border-[#fde68a] bg-[#fffbeb] p-6 text-sm font-semibold text-[#92400e]">
          Algunas graficas o el detalle han tardado mas de lo esperado, pero las metricas principales ya estan disponibles.
        </div>
      )}

      {ratios && !hasBlockingError && ratios.total_logos === 0 && (
        <div className="rounded-3xl border border-[#fde68a] bg-[#fffbeb] p-6 text-sm font-semibold text-[#92400e]">
          No hay datos suficientes para calcular {retentionWindow.toUpperCase()} en el periodo seleccionado.
        </div>
      )}

      {ratios && !hasBlockingError && ratios.total_logos > 0 && (
        <>
          <KpiCards data={ratios} />
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

          <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
            <div className="border-b border-[#e7e1f2] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Detalle de clientes churneados</p>
              <p className="mt-1 text-sm font-semibold text-[#6f6a80]">
                {accountsQuery.isLoading ? "Cargando detalle..." : `${accountsQuery.data?.count ?? 0} bajas en la ventana seleccionada`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#fbfaff] text-left text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Linea de negocio</th>
                    <th className="px-5 py-3">Mes de baja</th>
                    <th className="px-5 py-3 text-right">ARR perdido</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsQuery.isLoading ? (
                    <tr className="border-t border-[#f0ebf8]">
                      <td className="px-5 py-6 text-center font-semibold text-[#837a9f]" colSpan={4}>
                        Cargando detalle de clientes...
                      </td>
                    </tr>
                  ) : (
                    (accountsQuery.data?.items ?? []).map((item) => (
                      <tr key={`${item.account_name}-${item.product_type}`} className="border-t border-[#f0ebf8]">
                        <td className="px-5 py-3 font-semibold text-[#2f185f]">{item.account_name}</td>
                        <td className="px-5 py-3 text-[#6f6a80]">{item.product_type}</td>
                        <td className="px-5 py-3 text-[#6f6a80]">{formatMonth(item.churn_month)}</td>
                        <td className="px-5 py-3 text-right font-bold text-[#d03932]">-{formatEUR(item.arr_lost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t-2 border-[#e7e1f2] bg-[#fbfaff] font-black text-[#2f185f]">
                  <tr>
                    <td className="px-5 py-3" colSpan={3}>Total ARR churneado</td>
                    <td className="px-5 py-3 text-right text-[#d03932]">-{formatEUR(accountsQuery.data?.total_arr_lost ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

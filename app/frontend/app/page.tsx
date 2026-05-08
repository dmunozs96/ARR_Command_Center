"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeEuro,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Database,
  Download,
  Filter,
  Globe2,
  Menu,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";
import { KPICards } from "@/components/KPICards";
import { ARRTotalChart } from "@/components/ARRTotalChart";
import { ARRYearBarsChart } from "@/components/ARRYearBarsChart";
import { ARRChart } from "@/components/ARRChart";
import { ARRBreakdownTable } from "@/components/ARRBreakdownTable";
import { TopAccountsBarsChart } from "@/components/TopAccountsBarsChart";
import { TopAccountsLinesChart } from "@/components/TopAccountsLinesChart";
import { AlertsPanel } from "@/components/AlertsPanel";
import { ExcelUploadButton } from "@/components/ExcelUploadButton";
import { FilterBar } from "@/components/FilterBar";
import { SyncButton } from "@/components/SyncButton";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { currentMonthStart, formatCompactEUR, formatDateTime, formatEUR, formatMonth } from "@/lib/utils";

const DEFAULT_MONTH_FROM = "2021-01-01";
const DEFAULT_MONTH_TO = `${new Date().toISOString().slice(0, 7)}-01`;

export default function DashboardPage() {
  const [productType, setProductType] = useState("");
  const [monthFrom, setMonthFrom] = useState(DEFAULT_MONTH_FROM);
  const [monthTo, setMonthTo] = useState(DEFAULT_MONTH_TO);
  const [arrMode, setArrMode] = useState<"from_start" | "from_close">("from_start");
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const { activeSnapshot, isLoading: snapshotsLoading } = useSnapshotContext();
  const currentMonth = currentMonthStart();

  const arrQuery = useQuery({
    queryKey: ["arr-summary", activeSnapshot?.id, monthFrom, monthTo, productType, arrMode],
    queryFn: () =>
      api.getARRSummary({
        snapshot_id: activeSnapshot?.id,
        month_from: monthFrom,
        month_to: monthTo,
        product_type: productType || undefined,
        mode: arrMode,
      }),
    enabled: !!activeSnapshot,
  });

  const months = arrQuery.data?.months ?? [];
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  const alertsQuery = useQuery({
    queryKey: ["alerts-unreviewed", activeSnapshot?.id],
    queryFn: () => api.getAlerts({ snapshot_id: activeSnapshot?.id, reviewed: false }),
    enabled: !!activeSnapshot,
  });

  const stripeQuery = useQuery({
    queryKey: ["stripe-mrr", activeSnapshot?.id],
    queryFn: () => api.getStripeMRR({ snapshot_id: activeSnapshot?.id }),
    enabled: !!activeSnapshot,
  });

  const accountQuery = useQuery({
    queryKey: ["arr-by-account", activeSnapshot?.id, monthFrom, monthTo, arrMode],
    queryFn: () =>
      api.getARRByAccount({
        snapshot_id: activeSnapshot?.id,
        month_from: monthFrom,
        month_to: monthTo,
        mode: arrMode,
        limit: 20,
      }),
    enabled: !!activeSnapshot,
  });

  const consultantsQuery = useQuery({
    queryKey: ["arr-consultants", activeSnapshot?.id, lastMonth?.month],
    queryFn: () =>
      api.getARRByConsultant({
        snapshot_id: activeSnapshot?.id,
        month: lastMonth?.month ?? currentMonth,
      }),
    enabled: !!activeSnapshot && !!lastMonth,
  });

  const unreviewedCount = alertsQuery.data?.length ?? 0;
  const missingStripeCurrentMonth =
    !!activeSnapshot &&
    stripeQuery.data !== undefined &&
    !stripeQuery.data.some((row) => row.month === currentMonth);

  const topConsultants = useMemo(
    () => (consultantsQuery.data?.consultants ?? []).slice().sort((a, b) => b.arr_total - a.arr_total).slice(0, 5),
    [consultantsQuery.data],
  );

  const countryMix = useMemo(() => {
    const totals = new Map<string, number>();
    for (const consultant of consultantsQuery.data?.consultants ?? []) {
      const key = consultant.country || "Sin pais";
      const val = Number.isFinite(consultant.arr_total) ? consultant.arr_total : 0;
      totals.set(key, (totals.get(key) ?? 0) + val);
    }
    return Array.from(totals.entries())
      .map(([country, arr]) => ({ country, arr }))
      .sort((a, b) => b.arr - a.arr)
      .slice(0, 4);
  }, [consultantsQuery.data]);

  const hasQueryError = arrQuery.isError || alertsQuery.isError || stripeQuery.isError || consultantsQuery.isError;
  const queryErrorMessage = arrQuery.error
    ? getAPIErrorMessage(arrQuery.error, "No se pudo cargar el dashboard.")
    : alertsQuery.error
      ? getAPIErrorMessage(alertsQuery.error, "No se pudieron cargar las alertas.")
      : stripeQuery.error
        ? getAPIErrorMessage(stripeQuery.error, "No se pudo cargar Stripe MRR.")
        : consultantsQuery.error
          ? getAPIErrorMessage(consultantsQuery.error, "No se pudo cargar el ranking de consultores.")
          : null;

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <div className="sticky top-0 z-30 border-b border-[#e7e1f2] bg-white/85 px-4 py-3 backdrop-blur xl:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6d35ff] text-white">
              <Menu size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">isEazy</p>
              <h1 className="text-base font-black text-[#151229]">ARR Center</h1>
            </div>
          </div>
          <Link href="/alerts" className="rounded-2xl bg-[#efe9ff] px-3 py-2 text-sm font-black text-[#2f185f]">
            Alertas
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1560px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[2rem] bg-[#2f185f] text-white shadow-[0_30px_80px_rgba(49,24,95,0.22)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#d8caff]">
                <BadgeEuro size={15} />
                Finance intelligence
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
                Cuadro de mandos ARR
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#efe9ff]">
                Vista ejecutiva para analizar revenue anualizado por periodo, linea de negocio, pais y consultor, con control de calidad de datos y conciliacion MRR.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-2xl bg-white p-1 text-sm font-black text-[#2f185f]">
                  <button
                    onClick={() => setArrMode("from_start")}
                    className={`rounded-xl px-4 py-2 transition ${arrMode === "from_start" ? "bg-[#6d35ff] text-white shadow-lg shadow-[#6d35ff]/20" : "hover:bg-[#f4f0fb]"}`}
                  >
                    Desde inicio
                  </button>
                  <button
                    onClick={() => setArrMode("from_close")}
                    className={`rounded-xl px-4 py-2 transition ${arrMode === "from_close" ? "bg-[#6d35ff] text-white shadow-lg shadow-[#6d35ff]/20" : "hover:bg-[#f4f0fb]"}`}
                  >
                    Desde cierre
                  </button>
                </div>
                <ExcelUploadButton />
                <SyncButton />
                <button
                  disabled={!activeSnapshot || downloadingExcel}
                  onClick={async () => {
                    if (!activeSnapshot) return;
                    setDownloadingExcel(true);
                    try {
                      await api.downloadSnapshotExcel(activeSnapshot.id);
                    } finally {
                      setDownloadingExcel(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingExcel ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Download size={16} />
                  )}
                  Descargar Snapshot
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#d8caff]">
                  <Database size={15} />
                  Snapshot
                </p>
                <p className="mt-3 text-lg font-black">
                  {activeSnapshot ? formatDateTime(activeSnapshot.created_at) : snapshotsLoading ? "Cargando..." : "Sin snapshot"}
                </p>
                <p className="mt-1 text-sm text-[#efe9ff]">
                  {activeSnapshot ? `${activeSnapshot.sf_records_processed ?? 0} registros procesados` : "Sube un Excel o sincroniza Salesforce"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#d8caff]">
                  <CalendarDays size={15} />
                  Periodo
                </p>
                <p className="mt-3 text-lg font-black">
                  {formatMonth(monthFrom)} - {formatMonth(monthTo)}
                </p>
                <p className="mt-1 text-sm text-[#efe9ff]">
                  {productType || "Todas las lineas de negocio"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {snapshotsLoading && (
          <section className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
            Cargando snapshots y contexto del dashboard...
          </section>
        )}

        {!snapshotsLoading && !activeSnapshot && (
          <section className="rounded-3xl border border-[#e7e1f2] bg-white p-6 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
            <h2 className="text-xl font-black text-[#151229]">Todavia no hay snapshots</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6a80]">
              Sube el Excel base o ejecuta una sincronizacion para poblar el dashboard con ARR, alertas, consultores y MRR.
            </p>
          </section>
        )}

        {hasQueryError && queryErrorMessage && (
          <section data-testid="dashboard-error" className="rounded-3xl border border-[#ffd0cd] bg-[#fff0ef] p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#8e2521]">No se pudo cargar el dashboard</h2>
            <p className="mt-1 text-sm font-medium text-[#b82f2a]">{queryErrorMessage}</p>
          </section>
        )}

        <KPICards current={lastMonth} months={months} loading={arrQuery.isLoading} unreviewedCount={unreviewedCount} monthsCount={months.length} />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#6d35ff]">
              <Filter size={17} />
              Analisis
            </div>
            <FilterBar
              productType={productType}
              onProductTypeChange={setProductType}
              monthFrom={monthFrom}
              onMonthFromChange={setMonthFrom}
              monthTo={monthTo}
              onMonthToChange={setMonthTo}
            />
            <ARRTotalChart months={months} loading={arrQuery.isLoading} />
            <ARRYearBarsChart months={months} monthTo={monthTo} loading={arrQuery.isLoading} />
            <ARRChart months={months} loading={arrQuery.isLoading} />
            <ARRBreakdownTable current={lastMonth} months={months} loading={arrQuery.isLoading} />

            <div className="mt-10 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Distribución por cliente</h2>
              <p className="text-sm text-gray-500 mt-1">
                Top 20 cuentas por ARR. El resto se agrupa en &quot;Otros&quot;.
              </p>
            </div>
            <TopAccountsBarsChart data={accountQuery.data} isLoading={accountQuery.isLoading} />
            <TopAccountsLinesChart data={accountQuery.data} isLoading={accountQuery.isLoading} />
          </div>

          <aside className="space-y-6">
            {missingStripeCurrentMonth && (
              <section data-testid="dashboard-stripe-warning" className="rounded-3xl border border-[#bdefff] bg-[#eefaff] p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00a7d8] text-white">
                    <CircleDollarSign size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#151229]">Falta MRR Stripe</h2>
                    <p className="mt-1 text-sm leading-6 text-[#006f94]">
                      No hay dato cargado para Author Online en el mes actual.
                    </p>
                    <Link href="/stripe" className="mt-3 inline-flex items-center gap-1 text-sm font-black text-[#006f94]">
                      Revisar Stripe
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            <AlertsPanel alerts={alertsQuery.data ?? []} loading={!activeSnapshot || alertsQuery.isLoading} />

            <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Consultores</p>
                  <h2 className="mt-1 text-xl font-black text-[#151229]">Top ARR</h2>
                </div>
                <UsersRound className="text-[#6d35ff]" size={24} />
              </div>
              <div className="mt-4 space-y-3">
                {topConsultants.length === 0 ? (
                  <p className="rounded-2xl bg-[#fbfaff] p-4 text-sm font-semibold text-[#837a9f]">
                    Sin ranking disponible para el mes seleccionado.
                  </p>
                ) : (
                  topConsultants.map((consultant, index) => (
                    <div key={consultant.name} className="flex items-center justify-between gap-3 rounded-2xl bg-[#fbfaff] p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#efe9ff] text-sm font-black text-[#6d35ff]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#151229]">{consultant.name}</p>
                          <p className="text-xs font-semibold text-[#837a9f]">{consultant.country || "Sin pais"}</p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-black text-[#151229]">{formatCompactEUR(consultant.arr_total)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Geografia</p>
                  <h2 className="mt-1 text-xl font-black text-[#151229]">ARR por pais</h2>
                </div>
                <Globe2 className="text-[#20c7a8]" size={24} />
              </div>
              <div className="mt-4 space-y-3">
                {countryMix.length === 0 ? (
                  <p className="rounded-2xl bg-[#fbfaff] p-4 text-sm font-semibold text-[#837a9f]">
                    Sin distribucion geografica para este filtro.
                  </p>
                ) : (
                  countryMix.map((row) => {
                    const max = countryMix[0]?.arr || 1;
                    return (
                      <div key={row.country}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-black text-[#151229]">{row.country}</span>
                          <span className="font-black text-[#6f6a80]">{formatEUR(row.arr)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#efe9ff]">
                          <div className="h-full rounded-full bg-[#20c7a8]" style={{ width: `${Math.max(8, (row.arr / max) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <Link href="/consultants" className="flex items-center justify-between rounded-3xl bg-[#6d35ff] p-5 text-white shadow-lg shadow-[#6d35ff]/20 transition hover:bg-[#5b27e6]">
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.14em] text-[#d8caff]">Drill-down</span>
                <span className="mt-1 block text-lg font-black">Abrir vista consultores</span>
              </span>
              <BarChart3 size={28} />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

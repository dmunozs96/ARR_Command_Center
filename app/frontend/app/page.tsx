"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";
import { KPICards } from "@/components/KPICards";
import { ARRChart } from "@/components/ARRChart";
import { ARRBreakdownTable } from "@/components/ARRBreakdownTable";
import { AlertsPanel } from "@/components/AlertsPanel";
import { ExcelUploadButton } from "@/components/ExcelUploadButton";
import { FilterBar } from "@/components/FilterBar";
import { SyncButton } from "@/components/SyncButton";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { currentMonthStart, formatDateTime, formatMonth } from "@/lib/utils";

const DEFAULT_MONTH_FROM = "2021-01-01";
const DEFAULT_MONTH_TO = `${new Date().toISOString().slice(0, 7)}-01`;

export default function DashboardPage() {
  const [productType, setProductType] = useState("");
  const [monthFrom, setMonthFrom] = useState(DEFAULT_MONTH_FROM);
  const [monthTo, setMonthTo] = useState(DEFAULT_MONTH_TO);
  const { activeSnapshot, isLoading: snapshotsLoading } = useSnapshotContext();
  const currentMonth = currentMonthStart();

  const arrQuery = useQuery({
    queryKey: ["arr-summary", activeSnapshot?.id, monthFrom, monthTo, productType],
    queryFn: () =>
      api.getARRSummary({
        snapshot_id: activeSnapshot?.id,
        month_from: monthFrom,
        month_to: monthTo,
        product_type: productType || undefined,
      }),
    enabled: !!activeSnapshot,
  });

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

  const months = arrQuery.data?.months ?? [];
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const unreviewedCount = alertsQuery.data?.length ?? 0;
  const missingStripeCurrentMonth =
    !!activeSnapshot &&
    stripeQuery.data !== undefined &&
    !stripeQuery.data.some((row) => row.month === currentMonth);
  const hasQueryError = arrQuery.isError || alertsQuery.isError || stripeQuery.isError;
  const queryErrorMessage = arrQuery.error
    ? getAPIErrorMessage(arrQuery.error, "No se pudo cargar el dashboard.")
    : alertsQuery.error
      ? getAPIErrorMessage(alertsQuery.error, "No se pudieron cargar las alertas.")
      : stripeQuery.error
        ? getAPIErrorMessage(stripeQuery.error, "No se pudo cargar Stripe MRR.")
        : null;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            ARR Total Compania
            {lastMonth ? ` - ${formatMonth(lastMonth.month)}` : ""}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Snapshot activo: {activeSnapshot ? formatDateTime(activeSnapshot.created_at) : "-"}
          </p>
        </div>
        <div className="flex items-start gap-3">
          {unreviewedCount > 0 && (
            <a
              href="/alerts"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 transition-colors hover:bg-amber-100"
            >
              {unreviewedCount} alerta{unreviewedCount !== 1 ? "s" : ""} pendientes
            </a>
          )}
          <ExcelUploadButton />
          <SyncButton />
        </div>
      </div>

      {snapshotsLoading && (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Cargando snapshots y contexto del dashboard...
        </section>
      )}

      {!snapshotsLoading && !activeSnapshot && (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Todavia no hay snapshots</h2>
          <p className="mt-2 text-sm text-stone-600">
            Sube manualmente el Excel base o ejecuta una sync para empezar a poblar el dashboard.
          </p>
        </section>
      )}

      {hasQueryError && queryErrorMessage && (
        <section
          data-testid="dashboard-error"
          className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-red-900">No se pudo cargar el dashboard</h2>
          <p className="mt-1 text-sm text-red-800">{queryErrorMessage}</p>
        </section>
      )}

      <KPICards current={lastMonth} loading={arrQuery.isLoading} />

      {missingStripeCurrentMonth && (
        <section
          data-testid="dashboard-stripe-warning"
          className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-sky-950">
                Falta el MRR Stripe del mes actual
              </h2>
              <p className="mt-1 text-sm text-sky-800">
                Aun no hay dato cargado para la vista de Author Online de este mes.
              </p>
            </div>
            <a
              href="/stripe"
              className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-100"
            >
              Revisar Stripe
            </a>
          </div>
        </section>
      )}

      <AlertsPanel
        alerts={alertsQuery.data ?? []}
        loading={!activeSnapshot || alertsQuery.isLoading}
      />

      <FilterBar
        productType={productType}
        onProductTypeChange={setProductType}
        monthFrom={monthFrom}
        onMonthFromChange={setMonthFrom}
        monthTo={monthTo}
        onMonthToChange={setMonthTo}
      />

      <ARRChart months={months} loading={arrQuery.isLoading} />

      <ARRBreakdownTable current={lastMonth} prev={prevMonth} loading={arrQuery.isLoading} />
    </div>
  );
}

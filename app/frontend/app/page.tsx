"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { KPICards } from "@/components/KPICards";
import { ARRChart } from "@/components/ARRChart";
import { ARRBreakdownTable } from "@/components/ARRBreakdownTable";
import { FilterBar } from "@/components/FilterBar";
import { SyncButton } from "@/components/SyncButton";
import { formatMonth } from "@/lib/utils";

const DEFAULT_MONTH_FROM = "2021-01-01";

function currentMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DashboardPage() {
  const [productType, setProductType] = useState("");
  const [monthFrom, setMonthFrom] = useState(DEFAULT_MONTH_FROM);
  const [monthTo, setMonthTo] = useState(currentMonthISO);

  const { data: snapshots } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });

  const latestSnapshot = snapshots?.[0];

  const { data: arrData, isLoading } = useQuery({
    queryKey: ["arr-summary", latestSnapshot?.id, monthFrom, monthTo, productType],
    queryFn: () =>
      api.getARRSummary({
        snapshot_id: latestSnapshot?.id,
        month_from: monthFrom,
        month_to: monthTo,
        product_type: productType || undefined,
      }),
    enabled: !!latestSnapshot,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["alerts-unreviewed", latestSnapshot?.id],
    queryFn: () =>
      api.getAlerts({ snapshot_id: latestSnapshot?.id, reviewed: false }),
    enabled: !!latestSnapshot,
  });

  const months = arrData?.months ?? [];
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const unreviewedCount = alertsData?.length ?? 0;

  const lastSyncLabel = latestSnapshot
    ? new Date(latestSnapshot.created_at).toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            ARR Total Compañía
            {lastMonth ? ` — ${formatMonth(lastMonth.month)}` : ""}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Última sync: {lastSyncLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreviewedCount > 0 && (
            <a
              href="/alerts"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-md hover:bg-amber-100 transition-colors"
            >
              ⚠️ {unreviewedCount} alerta{unreviewedCount !== 1 ? "s" : ""}
            </a>
          )}
          <SyncButton />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards current={lastMonth} loading={isLoading} />

      {/* Filters */}
      <FilterBar
        productType={productType}
        onProductTypeChange={setProductType}
        monthFrom={monthFrom}
        onMonthFromChange={setMonthFrom}
        monthTo={monthTo}
        onMonthToChange={setMonthTo}
      />

      {/* Chart */}
      <ARRChart months={months} loading={isLoading} />

      {/* Breakdown Table */}
      <ARRBreakdownTable
        current={lastMonth}
        prev={prevMonth}
        loading={isLoading}
      />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitCompare } from "lucide-react";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { productTypeFilterParams } from "@/lib/utils";
import { CommittedVsRealKPIs } from "@/components/CommittedVsRealKPIs";
import { DeltaTrendChart } from "@/components/DeltaTrendChart";
import { DeltaMonthBreakdown } from "@/components/DeltaMonthBreakdown";
import { ImplementationAlertsTable } from "@/components/ImplementationAlertsTable";

function addMonths(isoDate: string, n: number): string {
  const [y, m] = isoDate.split("-").map(Number);
  const zero = y * 12 + m - 1 + n;
  return `${Math.floor(zero / 12)}-${String((zero % 12) + 1).padStart(2, "0")}-01`;
}

function buildMonthRange(from: string, to: string): string[] {
  const months: string[] = [];
  let cur = from.slice(0, 7) + "-01";
  const end = to.slice(0, 7) + "-01";
  while (cur <= end) {
    months.push(cur);
    cur = addMonths(cur, 1);
  }
  return months;
}

export default function CommittedVsRealPage() {
  const { activeSnapshot } = useSnapshotContext();
  const { productType, accountName, monthFrom, monthTo } = useAnalysisFilters();
  const ptParams = productTypeFilterParams(productType);

  const trendQuery = useQuery({
    queryKey: ["delta-trend", activeSnapshot?.id, monthFrom, monthTo, productType],
    queryFn: () =>
      api.getDeltaMonthlyTrend({
        snapshot_id: activeSnapshot?.id,
        month_from: monthFrom,
        month_to: monthTo,
        ...ptParams,
      }),
    enabled: !!activeSnapshot,
  });

  const alertsQuery = useQuery({
    queryKey: ["delta-alerts", activeSnapshot?.id, productType],
    queryFn: () =>
      api.getImplementationAlerts({
        snapshot_id: activeSnapshot?.id,
        ...ptParams,
      }),
    enabled: !!activeSnapshot,
  });

  const months = trendQuery.data?.months ?? [];
  const currentMonth = months[months.length - 1] ?? null;
  const previousMonth = months.length >= 2 ? months[months.length - 2] : null;

  const weightedAvgDays = useMemo(() => {
    const alerts = alertsQuery.data?.alerts ?? [];
    const relevant = alerts.filter((a) => a.is_statistically_reliable || true);
    const totalArr = relevant.reduce((s, a) => s + a.arr_value, 0);
    if (totalArr === 0) return 0;
    return relevant.reduce((s, a) => s + a.days_since_close * a.arr_value, 0) / totalArr;
  }, [alertsQuery.data]);

  const availableMonths = useMemo(
    () => buildMonthRange(monthFrom, monthTo),
    [monthFrom, monthTo]
  );

  const isLoading = trendQuery.isLoading || alertsQuery.isLoading;

  if (!activeSnapshot) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-[#9ca3af]">Selecciona un snapshot para continuar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efe9ff] text-[#6d35ff]">
          <GitCompare size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#2f185f]">Committed vs Real</h1>
          <p className="text-sm text-[#9ca3af]">ARR firmado pendiente de activar</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-[#9ca3af]">Cargando datos…</p>
        </div>
      )}

      {!isLoading && currentMonth && (
        <CommittedVsRealKPIs
          current={currentMonth}
          previous={previousMonth}
          weightedAvgDays={weightedAvgDays}
        />
      )}

      {!isLoading && trendQuery.data && (
        <DeltaTrendChart
          months={months}
          trendNote={trendQuery.data.trend_note}
          productType={productType ?? undefined}
        />
      )}

      {!isLoading && availableMonths.length > 0 && (
        <DeltaMonthBreakdown
          availableMonths={availableMonths}
          snapshotId={activeSnapshot.id}
          productType={productType ?? undefined}
          accountName={accountName ?? undefined}
        />
      )}

      {!isLoading && alertsQuery.data && (
        <ImplementationAlertsTable
          alerts={alertsQuery.data.alerts}
          blDistributions={alertsQuery.data.bl_distributions}
        />
      )}
    </div>
  );
}

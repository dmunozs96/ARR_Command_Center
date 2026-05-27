"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, Info } from "lucide-react";
import { SnapshotComparisonChart } from "@/components/SnapshotComparisonChart";
import { SnapshotDetailTable } from "@/components/SnapshotDetailTable";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { formatDateTime, formatMonth, productTypeFilterParams } from "@/lib/utils";

function snapshotLabel(createdAt: string, syncType: string, notes: string | null): string {
  const note = notes ? ` - ${notes}` : "";
  return `${formatDateTime(createdAt)} - ${syncType}${note}`;
}

export default function SnapshotReviewPage() {
  const { snapshots, isLoading: snapshotsLoading } = useSnapshotContext();
  const { productType, accountName, monthFrom, monthTo } = useAnalysisFilters();
  const [snapshotASelection, setSnapshotASelection] = useState<string | null>(null);
  const [snapshotBSelection, setSnapshotBSelection] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [onlyChanges, setOnlyChanges] = useState(false);

  const snapshotAId = snapshotASelection ?? snapshots[1]?.id ?? "";
  const snapshotBId = snapshotBSelection ?? snapshots[0]?.id ?? "";
  const canCompare = Boolean(snapshotAId && snapshotBId && snapshotAId !== snapshotBId);
  const filters = productTypeFilterParams(productType);

  const totalsQuery = useQuery({
    queryKey: ["snapshot-review-totals", snapshotAId, snapshotBId, productType, accountName],
    queryFn: () =>
      api.getSnapshotReviewTotals({
        snapshot_a_id: snapshotAId,
        snapshot_b_id: snapshotBId,
        ...filters,
        account_name: accountName || undefined,
      }),
    enabled: canCompare,
  });

  const commonMonths = useMemo(
    () =>
      (totalsQuery.data?.data ?? []).filter(
        (point) =>
          point.arr_a !== null &&
          point.arr_b !== null &&
          point.month >= monthFrom &&
          point.month <= monthTo,
      ),
    [monthFrom, monthTo, totalsQuery.data?.data],
  );

  const effectiveSelectedMonth = commonMonths.some((point) => point.month === selectedMonth)
    ? selectedMonth
    : commonMonths.at(-1)?.month ?? null;

  const detailQuery = useQuery({
    queryKey: ["snapshot-review-period", snapshotAId, snapshotBId, effectiveSelectedMonth, productType, accountName, onlyChanges],
    queryFn: () =>
      api.getSnapshotReviewPeriodDetail({
        snapshot_a_id: snapshotAId,
        snapshot_b_id: snapshotBId,
        month: effectiveSelectedMonth ?? "",
        ...filters,
        account_name: accountName || undefined,
        only_changes: onlyChanges,
      }),
    enabled: canCompare && Boolean(effectiveSelectedMonth),
  });

  return (
    <div data-testid="snapshot-review-page" className="mx-auto max-w-[1500px] space-y-6 p-6 lg:p-8">
      <header className="flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe9ff] text-[#6d35ff]">
          <GitCompare size={24} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Auditoria historica</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#151229]">Revisor de Snapshot</h1>
          <p className="mt-2 text-sm text-[#6f6a80]">
            Detecta cambios retroactivos entre dos versiones de los datos de ARR.
          </p>
        </div>
      </header>

      {!snapshotsLoading && snapshots.length < 2 && (
        <section className="rounded-3xl border border-[#e7e1f2] bg-white p-10 text-center">
          <h2 className="text-xl font-bold text-[#151229]">Se necesitan dos snapshots</h2>
          <p className="mt-2 text-sm text-[#6f6a80]">
            Genera otra sincronizacion o importacion para poder comparar cambios historicos.
          </p>
        </section>
      )}

      {snapshots.length >= 2 && (
        <>
          <section className="grid gap-4 rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)] md:grid-cols-2">
            <label className="text-sm font-semibold text-[#2f185f]">
              Snapshot A (referencia)
              <select
                aria-label="Snapshot A (referencia)"
                value={snapshotAId}
                onChange={(event) => setSnapshotASelection(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#e7e1f2] bg-white px-3 py-3 text-sm font-medium text-[#151229]"
              >
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshotLabel(snapshot.created_at, snapshot.sync_type, snapshot.notes)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-[#2f185f]">
              Snapshot B (actual)
              <select
                aria-label="Snapshot B (actual)"
                value={snapshotBId}
                onChange={(event) => setSnapshotBSelection(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#e7e1f2] bg-white px-3 py-3 text-sm font-medium text-[#151229]"
              >
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshotLabel(snapshot.created_at, snapshot.sync_type, snapshot.notes)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {!canCompare && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Selecciona dos snapshots diferentes para compararlos.
            </p>
          )}

          {totalsQuery.data?.data_identical && (
            <p className="flex items-center gap-2 rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-4 py-3 text-sm font-semibold text-[#2f185f]">
              <Info size={16} />
              Estos dos snapshots tienen datos identicos.
            </p>
          )}

          {canCompare && (
            <>
              <SnapshotComparisonChart
                data={commonMonths}
                isLoading={totalsQuery.isLoading}
                onSelectMonth={setSelectedMonth}
              />

              <section className="flex flex-col gap-4 rounded-2xl border border-[#e7e1f2] bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
                <label className="text-sm font-semibold text-[#2f185f]">
                  Mes de detalle
                  <select
                    aria-label="Mes de detalle"
                    value={effectiveSelectedMonth ?? ""}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="mt-2 block min-w-56 rounded-xl border border-[#e7e1f2] bg-white px-3 py-2.5 text-sm"
                    disabled={commonMonths.length === 0}
                  >
                    {commonMonths.map((point) => (
                      <option key={point.month} value={point.month}>
                        {formatMonth(point.month)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#fbfaff] px-4 py-3 text-sm font-semibold text-[#2f185f]">
                  <input
                    type="checkbox"
                    checked={onlyChanges}
                    onChange={(event) => setOnlyChanges(event.target.checked)}
                    className="h-4 w-4 accent-[#6d35ff]"
                  />
                  Mostrar solo filas con cambios
                </label>
              </section>

              <SnapshotDetailTable detail={detailQuery.data} isLoading={detailQuery.isLoading} />
            </>
          )}
        </>
      )}
    </div>
  );
}

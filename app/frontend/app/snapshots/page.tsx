"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { formatDateTime, formatEUR, formatPct, snapshotStatusLabel } from "@/lib/utils";

function getSnapshotTotalArr(months: Array<{ total_arr: number }> | undefined): number | null {
  if (!months || months.length === 0) {
    return null;
  }
  return months[months.length - 1]?.total_arr ?? null;
}

function diffPct(base: number, next: number): number | null {
  if (base === 0) {
    return null;
  }
  return ((next - base) / base) * 100;
}

function SnapshotsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    snapshots,
    activeSnapshot,
    activeSnapshotId,
    setActiveSnapshotId,
    isLoading: snapshotsLoading,
  } = useSnapshotContext();

  const [leftSnapshotId, setLeftSnapshotId] = useState<string>("");
  const [rightSnapshotId, setRightSnapshotId] = useState<string>("");

  useEffect(() => {
    if (snapshots.length === 0) {
      return;
    }

    const urlActive = searchParams.get("active");
    const urlLeft = searchParams.get("left");
    const urlRight = searchParams.get("right");

    const ids = new Set(snapshots.map((snapshot) => snapshot.id));
    const fallbackLeft = snapshots[1]?.id ?? snapshots[0]?.id ?? "";
    const fallbackRight = snapshots[0]?.id ?? "";

    if (urlActive && ids.has(urlActive)) {
      setActiveSnapshotId(urlActive);
    }

    setLeftSnapshotId(urlLeft && ids.has(urlLeft) ? urlLeft : fallbackLeft);
    setRightSnapshotId(urlRight && ids.has(urlRight) ? urlRight : fallbackRight);
  }, [searchParams, setActiveSnapshotId, snapshots]);

  const snapshotSummaryQueries = useQueries({
    queries: snapshots.map((snapshot) => ({
      queryKey: ["snapshot-total-arr", snapshot.id],
      queryFn: () => api.getARRSummary({ snapshot_id: snapshot.id }),
      enabled: snapshots.length > 0,
    })),
  });

  const snapshotTotals = useMemo(() => {
    return Object.fromEntries(
      snapshots.map((snapshot, index) => [
        snapshot.id,
        getSnapshotTotalArr(snapshotSummaryQueries[index]?.data?.months),
      ])
    ) as Record<string, number | null>;
  }, [snapshotSummaryQueries, snapshots]);

  const comparisonSnapshotIds = useMemo(
    () => ({
      left: leftSnapshotId || snapshots[1]?.id || snapshots[0]?.id || "",
      right: rightSnapshotId || activeSnapshotId || snapshots[0]?.id || "",
    }),
    [activeSnapshotId, leftSnapshotId, rightSnapshotId, snapshots]
  );

  const [leftSummaryQuery, rightSummaryQuery, leftItemsQuery, rightItemsQuery] = useQueries({
    queries: [
      {
        queryKey: ["snapshot-comparison-summary", comparisonSnapshotIds.left],
        queryFn: () => api.getARRSummary({ snapshot_id: comparisonSnapshotIds.left }),
        enabled: !!comparisonSnapshotIds.left,
      },
      {
        queryKey: ["snapshot-comparison-summary", comparisonSnapshotIds.right],
        queryFn: () => api.getARRSummary({ snapshot_id: comparisonSnapshotIds.right }),
        enabled: !!comparisonSnapshotIds.right,
      },
      {
        queryKey: ["snapshot-comparison-items", comparisonSnapshotIds.left],
        queryFn: () =>
          api.getARRLineItems({ snapshot_id: comparisonSnapshotIds.left, page: 1, page_size: 20000 }),
        enabled: !!comparisonSnapshotIds.left,
      },
      {
        queryKey: ["snapshot-comparison-items", comparisonSnapshotIds.right],
        queryFn: () =>
          api.getARRLineItems({ snapshot_id: comparisonSnapshotIds.right, page: 1, page_size: 20000 }),
        enabled: !!comparisonSnapshotIds.right,
      },
    ],
  });

  const leftSnapshot = snapshots.find((snapshot) => snapshot.id === comparisonSnapshotIds.left) ?? null;
  const rightSnapshot = snapshots.find((snapshot) => snapshot.id === comparisonSnapshotIds.right) ?? null;

  const comparisonMetrics = useMemo(() => {
    const leftItems = leftItemsQuery.data?.items ?? [];
    const rightItems = rightItemsQuery.data?.items ?? [];

    const leftById = new Map(leftItems.map((item) => [item.sf_line_item_id, item]));
    const rightById = new Map(rightItems.map((item) => [item.sf_line_item_id, item]));

    let modifiedItems = 0;
    for (const [lineItemId, rightItem] of rightById.entries()) {
      const leftItem = leftById.get(lineItemId);
      if (!leftItem) {
        continue;
      }

      if (
        leftItem.annualized_value !== rightItem.annualized_value ||
        leftItem.product_type !== rightItem.product_type ||
        leftItem.effective_start_date !== rightItem.effective_start_date ||
        leftItem.effective_end_date !== rightItem.effective_end_date
      ) {
        modifiedItems += 1;
      }
    }

    const newItems = rightItems.filter((item) => !leftById.has(item.sf_line_item_id)).length;
    const removedItems = leftItems.filter((item) => !rightById.has(item.sf_line_item_id)).length;

    return { newItems, removedItems, modifiedItems };
  }, [leftItemsQuery.data?.items, rightItemsQuery.data?.items]);

  const comparisonRows = useMemo(() => {
    const leftMonths = leftSummaryQuery.data?.months ?? [];
    const rightMonths = rightSummaryQuery.data?.months ?? [];
    const leftCurrent = leftMonths[leftMonths.length - 1];
    const rightCurrent = rightMonths[rightMonths.length - 1];

    const keys = new Set([
      ...Object.keys(leftCurrent?.by_product_type ?? {}),
      ...Object.keys(rightCurrent?.by_product_type ?? {}),
    ]);

    return Array.from(keys)
      .map((key) => {
        const leftValue = leftCurrent?.by_product_type[key] ?? 0;
        const rightValue = rightCurrent?.by_product_type[key] ?? 0;
        const diff = rightValue - leftValue;

        return {
          key,
          leftValue,
          rightValue,
          diff,
          diffPct: diffPct(leftValue, rightValue),
        };
      })
      .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff));
  }, [leftSummaryQuery.data?.months, rightSummaryQuery.data?.months]);

  const totalLeft = getSnapshotTotalArr(leftSummaryQuery.data?.months);
  const totalRight = getSnapshotTotalArr(rightSummaryQuery.data?.months);

  function updateUrl(next: { active?: string; left?: string; right?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.active) params.set("active", next.active);
    if (next.left) params.set("left", next.left);
    if (next.right) params.set("right", next.right);
    router.replace(`/snapshots?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial de snapshots</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Selecciona el snapshot activo para todo el frontend y compara sincronizaciones.
          </p>
        </div>
        <a
          href="/"
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Volver al dashboard
        </a>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Listado de snapshots</h2>
            <p className="mt-1 text-xs text-gray-500">
              Fecha, ARR total, registros procesados y alertas de cada sincronizacion.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">ARR total</th>
                  <th className="px-4 py-3 text-right">Registros</th>
                  <th className="px-4 py-3 text-right">Alertas</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshotsLoading &&
                  [0, 1, 2].map((row) => (
                    <tr key={row} className="animate-pulse">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-4 rounded bg-gray-100" />
                      </td>
                    </tr>
                  ))}

                {!snapshotsLoading &&
                  snapshots.map((snapshot) => {
                    const isActive = snapshot.id === activeSnapshotId;

                    return (
                      <tr key={snapshot.id} className={isActive ? "bg-cyan-50/60" : "bg-white"}>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                            {snapshotStatusLabel(snapshot.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatDateTime(snapshot.created_at)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {snapshotTotals[snapshot.id] != null
                            ? formatEUR(snapshotTotals[snapshot.id] ?? 0)
                            : "..."}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {snapshot.sf_records_processed ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {snapshot.alerts_count ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveSnapshotId(snapshot.id);
                              updateUrl({ active: snapshot.id });
                            }}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                              isActive
                                ? "bg-cyan-600 text-white"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {isActive ? "Activo" : "Activar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Snapshot activo</h2>
            <p className="mt-1 text-xs text-gray-500">
              El dashboard, alertas, consultores y Stripe usan este snapshot.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {activeSnapshot ? formatDateTime(activeSnapshot.created_at) : "Sin seleccion"}
              </p>
              <p className="text-gray-600">
                {activeSnapshot ? snapshotStatusLabel(activeSnapshot.status) : "-"}
              </p>
              <p className="text-gray-500">
                Registros: {activeSnapshot?.sf_records_processed ?? "-"} | Alertas:{" "}
                {activeSnapshot?.alerts_count ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Notas de uso</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>El selector lateral guarda el snapshot activo en el navegador.</li>
              <li>La comparativa usa ARR total, diff por producto y diff por line item.</li>
              <li>Tras una nueva sync, puedes activar el snapshot nuevo desde esta pagina.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Comparativa entre snapshots</h2>
            <p className="mt-1 text-xs text-gray-500">
              Compara dos sincronizaciones para entender que cambio entre ellas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-600">
              Snapshot base
              <select
                value={comparisonSnapshotIds.left}
                onChange={(event) => {
                  setLeftSnapshotId(event.target.value);
                  updateUrl({ left: event.target.value });
                }}
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
              >
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {formatDateTime(snapshot.created_at)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600">
              Snapshot comparado
              <select
                value={comparisonSnapshotIds.right}
                onChange={(event) => {
                  setRightSnapshotId(event.target.value);
                  updateUrl({ right: event.target.value });
                }}
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
              >
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {formatDateTime(snapshot.created_at)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">ARR total</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {totalRight != null && totalLeft != null ? formatEUR(totalRight - totalLeft) : "..."}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {leftSnapshot && rightSnapshot
                ? `${formatDateTime(leftSnapshot.created_at)} -> ${formatDateTime(rightSnapshot.created_at)}`
                : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Nuevos line items</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{comparisonMetrics.newItems}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Eliminados</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{comparisonMetrics.removedItems}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Modificados</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{comparisonMetrics.modifiedItems}</p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Linea</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">Comparado</th>
                <th className="px-4 py-3 text-right">Diff</th>
                <th className="px-4 py-3 text-right">Diff %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(leftSummaryQuery.isLoading || rightSummaryQuery.isLoading) &&
                [0, 1, 2].map((row) => (
                  <tr key={row} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 rounded bg-gray-100" />
                    </td>
                  </tr>
                ))}

              {!leftSummaryQuery.isLoading &&
                !rightSummaryQuery.isLoading &&
                comparisonRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.key}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatEUR(row.leftValue)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatEUR(row.rightValue)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.diff >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatEUR(row.diff)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        row.diff >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatPct(row.diffPct)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function SnapshotsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl p-6 text-sm text-gray-500">Cargando snapshots...</div>}>
      <SnapshotsPageContent />
    </Suspense>
  );
}

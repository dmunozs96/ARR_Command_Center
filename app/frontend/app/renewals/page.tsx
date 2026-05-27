"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Download, Info } from "lucide-react";
import { RenewalsByMonthChart } from "@/components/RenewalsByMonthChart";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import type { RenewalItem, RenewalStatus } from "@/lib/types";
import { formatEUR, formatMonth, formatPct, productTypeFilterParams } from "@/lib/utils";

type StatusFilter = "all" | RenewalStatus;

const STATUS_BUTTONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "at_risk", label: "Solo en riesgo" },
  { value: "renewed", label: "Solo renovados" },
];

function exportCsv(items: RenewalItem[]) {
  const header = [
    "Estado",
    "Cliente",
    "Linea de negocio",
    "Consultor",
    "ARR actual",
    "Fecha de vencimiento",
    "Meses restantes",
    "ARR renovacion",
    "Delta renovacion pct",
  ];
  const rows = items.map((item) => [
    item.status === "renewed" ? "Renovado" : "En riesgo",
    item.account_name,
    item.product_type,
    item.consultant ?? "",
    item.current_arr,
    item.expiry_month,
    item.months_remaining,
    item.renewal_arr ?? "",
    item.renewal_delta_pct ?? "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "monitor-renovaciones.csv";
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function RenewalsPage() {
  const { productType, accountName } = useAnalysisFilters();
  const { activeSnapshot } = useSnapshotContext();
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const productFilters = productTypeFilterParams(productType);

  const monitorQuery = useQuery({
    queryKey: ["renewals-monitor", activeSnapshot?.id, horizonMonths, productType, accountName],
    queryFn: () =>
      api.getRenewalMonitor({
        snapshot_id: activeSnapshot?.id,
        horizon_months: horizonMonths,
        ...productFilters,
        account_name: accountName || undefined,
      }),
    enabled: !!activeSnapshot,
  });

  const visibleItems = useMemo(
    () => (monitorQuery.data?.items ?? []).filter((item) => statusFilter === "all" || item.status === statusFilter),
    [monitorQuery.data?.items, statusFilter],
  );

  return (
    <main className="flex-1 space-y-6 p-6" data-testid="renewals-page">
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#f97316]">
            <CalendarClock size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Alerta temprana</p>
            <h1 className="text-2xl font-black tracking-tight text-[#151229]">Monitor de Renovaciones</h1>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#6f6a80]">
          <Info size={14} />
          Renovado significa que existe un nuevo contrato firmado que comienza tras el vencimiento actual.
        </p>
      </header>

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Horizonte de vencimientos</p>
        <div className="flex flex-wrap items-center gap-2">
          {[3, 6, 12].map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => setHorizonMonths(months)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                horizonMonths === months ? "bg-[#6d35ff] text-white" : "bg-[#f4f0fb] text-[#6d35ff]"
              }`}
            >
              {months} meses
            </button>
          ))}
          <label className="ml-2 flex items-center gap-2 text-sm font-semibold text-[#6f6a80]">
            Libre
            <input
              aria-label="Horizonte libre en meses"
              type="number"
              min={1}
              max={24}
              value={horizonMonths}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= 24) setHorizonMonths(value);
              }}
              className="w-20 rounded-lg border border-[#e7e1f2] px-3 py-2 text-sm font-bold text-[#2f185f] focus:outline-none focus:ring-2 focus:ring-[#6d35ff]"
            />
          </label>
        </div>
      </section>

      {!activeSnapshot && (
        <div className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
          Selecciona un snapshot para consultar vencimientos.
        </div>
      )}

      {activeSnapshot && monitorQuery.isLoading && (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
        </div>
      )}

      {monitorQuery.isError && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
          No se han podido cargar las renovaciones para el horizonte seleccionado.
        </div>
      )}

      {monitorQuery.data && !monitorQuery.isLoading && !monitorQuery.isError && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">ARR en riesgo</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-[#d03932]">-{formatEUR(monitorQuery.data.summary.at_risk_arr)}</p>
            </section>
            <section className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">ARR ya renovado</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-[#0c8f76]">{formatEUR(monitorQuery.data.summary.renewed_arr)}</p>
            </section>
            <section className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">Contratos</p>
              <p className="mt-3 text-xl font-black tracking-tight text-[#151229]">
                {monitorQuery.data.summary.at_risk_count} en riesgo
              </p>
              <p className="mt-1 text-sm font-bold text-[#0c8f76]">{monitorQuery.data.summary.renewed_count} renovados</p>
            </section>
          </div>

          <RenewalsByMonthChart data={monitorQuery.data.by_month} />

          <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e7e1f2] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Contratos por vencer</p>
                <p className="mt-1 text-sm font-semibold text-[#6f6a80]">{visibleItems.length} contratos visibles</p>
              </div>
              <button
                type="button"
                onClick={() => exportCsv(visibleItems)}
                disabled={visibleItems.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e7e1f2] bg-white px-3 py-2 text-sm font-semibold text-[#2f185f] hover:bg-[#f7f3ff] disabled:opacity-40"
              >
                <Download size={16} />
                Exportar CSV
              </button>
              <div className="flex flex-wrap gap-2">
                {STATUS_BUTTONS.map((button) => (
                  <button
                    key={button.value}
                    type="button"
                    onClick={() => setStatusFilter(button.value)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                      statusFilter === button.value ? "bg-[#6d35ff] text-white" : "bg-[#f4f0fb] text-[#6d35ff]"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-sm">
                <thead className="bg-[#fbfaff] text-left text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
                  <tr>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Linea de negocio</th>
                    <th className="px-5 py-3">Consultor</th>
                    <th className="px-5 py-3 text-right">ARR actual</th>
                    <th className="px-5 py-3">Vence</th>
                    <th className="px-5 py-3 text-right">Meses</th>
                    <th className="px-5 py-3 text-right">ARR renovacion</th>
                    <th className="px-5 py-3 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebf8]">
                  {visibleItems.map((item) => (
                    <tr key={`${item.account_name}-${item.product_type}`}>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.status === "renewed" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                        }`}>
                          {item.status === "renewed" ? "Renovado" : "En riesgo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#2f185f]">{item.account_name}</td>
                      <td className="px-5 py-3 text-[#6f6a80]">{item.product_type}</td>
                      <td className="px-5 py-3 text-[#6f6a80]">{item.consultant ?? "-"}</td>
                      <td className="px-5 py-3 text-right font-bold text-[#2f185f]">{formatEUR(item.current_arr)}</td>
                      <td className="px-5 py-3 text-[#6f6a80]">{formatMonth(item.expiry_month)}</td>
                      <td className="px-5 py-3 text-right text-[#6f6a80]">{item.months_remaining}</td>
                      <td className="px-5 py-3 text-right font-bold text-[#0c8f76]">{formatEUR(item.renewal_arr)}</td>
                      <td className="px-5 py-3 text-right text-[#6f6a80]">{formatPct(item.renewal_delta_pct)}</td>
                    </tr>
                  ))}
                  {visibleItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-[#837a9f]">
                        No hay contratos que venzan en el horizonte seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

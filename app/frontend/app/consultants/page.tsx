"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { currentMonthStart, formatEUR, formatMonth, formatPct } from "@/lib/utils";
import type { ConsultantARR } from "@/lib/types";

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildConsultantsCSVRows(
  consultants: ConsultantARR[],
  month: string,
  totalARR: number,
): string[][] {
  const productTypes = Array.from(
    new Set(consultants.flatMap((c) => Object.keys(c.by_product_type))),
  ).sort((a, b) => a.localeCompare(b));

  return [
    ["Month", "Consultant", "Country", "ARR Total", "% del Total", ...productTypes],
    ...consultants.map((c) => {
      const pct = totalARR > 0 ? ((c.arr_total / totalARR) * 100).toFixed(1) : "";
      return [
        month,
        c.name,
        c.country,
        String(c.arr_total),
        pct,
        ...productTypes.map((t) =>
          c.by_product_type[t] != null ? String(c.by_product_type[t]) : "",
        ),
      ];
    }),
  ];
}

// Level 3: clients for a specific consultant + product_type (lazy)
function BLClientsLevel({
  snapshotId,
  consultantName,
  productType,
  month,
}: {
  snapshotId: string | undefined;
  consultantName: string;
  productType: string;
  month: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["consultant-bl-clients", snapshotId, consultantName, productType, month],
    queryFn: () =>
      api.getARRByAccount({
        snapshot_id: snapshotId,
        consultant: consultantName,
        product_type: productType,
        month_from: month,
        month_to: month,
        limit: 10,
      }),
  });

  if (isLoading) {
    return (
      <tr className="bg-violet-50">
        <td colSpan={4} className="py-2 pl-20 text-xs text-gray-400">
          Cargando clientes...
        </td>
      </tr>
    );
  }

  const accounts = data?.accounts ?? [];
  const others = data?.others;
  const othersTotal =
    others && Number.isFinite(others.total_arr) && others.total_arr > 0 ? others.total_arr : null;

  if (accounts.length === 0) {
    return (
      <tr className="bg-violet-50">
        <td colSpan={4} className="py-1.5 pl-20 text-xs text-gray-400">
          Sin datos de clientes.
        </td>
      </tr>
    );
  }

  return (
    <>
      {accounts.map((acct) => (
        <tr key={acct.account_name} className="bg-violet-50">
          <td className="py-1 pl-20 pr-4 text-xs text-gray-500">{acct.account_name}</td>
          <td className="px-4 py-1 text-xs text-gray-700">{formatEUR(acct.total_arr)}</td>
          <td colSpan={2} />
        </tr>
      ))}
      {othersTotal !== null && (
        <tr className="bg-violet-50">
          <td className="py-1 pl-20 pr-4 text-xs text-gray-400 italic">Otros clientes</td>
          <td className="px-4 py-1 text-xs text-gray-500">{formatEUR(othersTotal)}</td>
          <td colSpan={2} />
        </tr>
      )}
    </>
  );
}

export default function ConsultantsPage() {
  const [month] = useState(currentMonthStart);
  const [country, setCountry] = useState("");
  const [sortBy, setSortBy] = useState<"arr_total" | "name">("arr_total");
  // expanded consultant row
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  // expanded BL within a consultant: "consultantName|||productType"
  const [expandedBL, setExpandedBL] = useState<string | null>(null);
  const { activeSnapshot, isLoading: snapshotsLoading } = useSnapshotContext();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["consultants", activeSnapshot?.id, month, country],
    queryFn: () =>
      api.getARRByConsultant({
        snapshot_id: activeSnapshot?.id,
        month,
        country: country || undefined,
      }),
    enabled: !!activeSnapshot,
  });

  const consultants = useMemo(
    () =>
      [...(data?.consultants ?? [])].sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return b.arr_total - a.arr_total;
      }),
    [data?.consultants, sortBy],
  );

  const countries = Array.from(new Set((data?.consultants ?? []).map((item) => item.country)))
    .filter(Boolean)
    .sort();

  const totalARR = consultants.reduce(
    (sum, c) => sum + (Number.isFinite(c.arr_total) ? c.arr_total : 0),
    0,
  );
  const totalConsultants = consultants.length;

  function handleExport() {
    if (consultants.length === 0) return;
    const countryLabel = country || "todos";
    downloadCSV(
      `consultores_${month}_${countryLabel}.csv`,
      buildConsultantsCSVRows(consultants, month, totalARR),
    );
  }

  function toggleConsultant(name: string) {
    setExpandedConsultant((prev) => (prev === name ? null : name));
    setExpandedBL(null);
  }

  function toggleBL(consultantName: string, productType: string) {
    const key = `${consultantName}|||${productType}`;
    setExpandedBL((prev) => (prev === key ? null : key));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6" data-testid="consultants-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ARR por Consultor</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Snapshot activo aplicado a {formatMonth(month)}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Pais</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Todos</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={handleExport}
            disabled={consultants.length === 0}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {snapshotsLoading && (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm">
          Cargando snapshots...
        </section>
      )}

      {!snapshotsLoading && !activeSnapshot && (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">Todavia no hay snapshot activo</p>
          <p className="mt-1 text-sm text-stone-600">
            Crea o importa un snapshot antes de consultar el ARR por consultor.
          </p>
        </section>
      )}

      {isError && (
        <section
          data-testid="consultants-error"
          className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-red-900">
            No se pudo cargar la vista de consultores
          </p>
          <p className="mt-1 text-sm text-red-800">
            {getAPIErrorMessage(error, "Error al cargar el ARR por consultor.")}
          </p>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="consultants-kpis">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Consultores visibles
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{totalConsultants}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            ARR agregado
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{formatEUR(totalARR)}</p>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Exportacion
          </p>
          <p className="mt-2 text-sm leading-6 text-indigo-900">
            El CSV respeta el filtro de pais activo e incluye desglose por tipo de producto.
          </p>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" data-testid="consultants-table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                {[
                  { key: "name", label: "Consultor" },
                  { key: "arr_total", label: "ARR Total" },
                  { key: null, label: "% del Total" },
                  { key: null, label: "Pais" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={`px-4 py-2.5 ${key ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    onClick={() => key && setSortBy(key as typeof sortBy)}
                  >
                    {label}
                    {key && sortBy === key ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                [0, 1, 2, 3, 4].map((row) => (
                  <tr key={row} className="animate-pulse">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-4 w-full rounded bg-gray-100" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                consultants.map((consultant) => {
                  const isConsultantExpanded = expandedConsultant === consultant.name;
                  const blEntries = Object.entries(consultant.by_product_type).sort(
                    ([, l], [, r]) => r - l,
                  );

                  return (
                    <Fragment key={consultant.name}>
                      {/* Level 1: consultant row */}
                      <tr
                        className="cursor-pointer hover:bg-indigo-50"
                        onClick={() => toggleConsultant(consultant.name)}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          <span className="mr-1.5 text-gray-400">
                            {isConsultantExpanded ? "▼" : "▶"}
                          </span>
                          {consultant.name}
                        </td>
                        <td className="px-4 py-2.5 text-gray-900">
                          {formatEUR(consultant.arr_total)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {totalARR > 0
                            ? formatPct((consultant.arr_total / totalARR) * 100)
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{consultant.country}</td>
                      </tr>

                      {/* Level 2: BL rows (expandable) */}
                      {isConsultantExpanded &&
                        blEntries.map(([type, arr]) => {
                          const blKey = `${consultant.name}|||${type}`;
                          const isBLExpanded = expandedBL === blKey;
                          return (
                            <Fragment key={blKey}>
                              <tr
                                className="cursor-pointer bg-indigo-50 hover:bg-indigo-100"
                                onClick={() => toggleBL(consultant.name, type)}
                              >
                                <td className="py-1.5 pl-10 pr-4 text-xs text-gray-600">
                                  <span className="mr-1 text-gray-400">
                                    {isBLExpanded ? "▼" : "▶"}
                                  </span>
                                  {type}
                                </td>
                                <td className="px-4 py-1.5 text-xs text-gray-700">
                                  {formatEUR(arr)}
                                </td>
                                <td colSpan={2} />
                              </tr>

                              {/* Level 3: clients (lazy) */}
                              {isBLExpanded && (
                                <BLClientsLevel
                                  snapshotId={activeSnapshot?.id}
                                  consultantName={consultant.name}
                                  productType={type}
                                  month={month}
                                />
                              )}
                            </Fragment>
                          );
                        })}
                    </Fragment>
                  );
                })}

              {!isLoading && consultants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Sin datos para este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

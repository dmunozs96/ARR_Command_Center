"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { currentMonthStart, formatEUR, formatMoM, formatMonth, formatPct } from "@/lib/utils";
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

function buildConsultantsCSVRows(consultants: ConsultantARR[], month: string): string[][] {
  const productTypes = Array.from(
    new Set(consultants.flatMap((consultant) => Object.keys(consultant.by_product_type))),
  ).sort((a, b) => a.localeCompare(b));

  return [
    [
      "Month",
      "Consultant",
      "Country",
      "ARR Total",
      "MoM EUR",
      "MoM %",
      ...productTypes,
    ],
    ...consultants.map((consultant) => [
      month,
      consultant.name,
      consultant.country,
      String(consultant.arr_total),
      consultant.mom_change != null ? String(consultant.mom_change) : "",
      consultant.mom_pct != null ? String(consultant.mom_pct) : "",
      ...productTypes.map((type) =>
        consultant.by_product_type[type] != null ? String(consultant.by_product_type[type]) : "",
      ),
    ]),
  ];
}

export default function ConsultantsPage() {
  const [month] = useState(currentMonthStart);
  const [country, setCountry] = useState("");
  const [sortBy, setSortBy] = useState<"arr_total" | "name" | "mom_change">("arr_total");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
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
        if (sortBy === "mom_change") return (b.mom_change ?? 0) - (a.mom_change ?? 0);
        return b.arr_total - a.arr_total;
      }),
    [data?.consultants, sortBy],
  );

  const countries = Array.from(new Set((data?.consultants ?? []).map((item) => item.country)))
    .filter(Boolean)
    .sort();

  const totalARR = consultants.reduce((sum, consultant) => sum + consultant.arr_total, 0);
  const totalConsultants = consultants.length;

  function handleExport() {
    if (consultants.length === 0) {
      return;
    }
    const countryLabel = country || "todos";
    const filename = `consultores_${month}_${countryLabel}.csv`;
    downloadCSV(filename, buildConsultantsCSVRows(consultants, month));
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
                  { key: "mom_change", label: "MoM (EUR)" },
                  { key: null, label: "MoM (%)" },
                  { key: null, label: "Pais" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={`px-4 py-2.5 ${key ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    onClick={() => key && setSortBy(key as typeof sortBy)}
                  >
                    {label}
                    {key && sortBy === key ? " v" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                [0, 1, 2, 3, 4].map((row) => (
                  <tr key={row} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 w-full rounded bg-gray-100" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                consultants.map((consultant) => (
                  <Fragment key={consultant.name}>
                    <tr
                      className="cursor-pointer hover:bg-indigo-50"
                      onClick={() =>
                        setExpandedRow(expandedRow === consultant.name ? null : consultant.name)
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        <span className="mr-1.5 text-gray-400">
                          {expandedRow === consultant.name ? "v" : ">"}
                        </span>
                        {consultant.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{formatEUR(consultant.arr_total)}</td>
                      <td
                        className={`px-4 py-2.5 ${
                          (consultant.mom_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatMoM(consultant.mom_change)}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          (consultant.mom_pct ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatPct(consultant.mom_pct)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{consultant.country}</td>
                    </tr>

                    {expandedRow === consultant.name &&
                      Object.entries(consultant.by_product_type)
                        .sort(([, left], [, right]) => right - left)
                        .map(([type, arr]) => (
                          <tr key={`${consultant.name}-${type}`} className="bg-indigo-50">
                            <td className="py-1.5 pl-10 pr-4 text-xs text-gray-500">{`> ${type}`}</td>
                            <td className="px-4 py-1.5 text-xs text-gray-700">{formatEUR(arr)}</td>
                            <td colSpan={3} />
                          </tr>
                        ))}
                  </Fragment>
                ))}

              {!isLoading && consultants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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

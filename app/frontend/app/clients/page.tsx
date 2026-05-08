"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarRange, Check, ChevronDown, Layers3 } from "lucide-react";
import { api } from "@/lib/api";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { useBLGrouping } from "@/lib/bl-grouping-context";
import { useARRMode } from "@/lib/arr-mode-context";
import { formatMonth } from "@/lib/utils";
import { ClientARRTable } from "@/components/ClientARRTable";
import { ClientARRChart } from "@/components/ClientARRChart";
import { TopAccountsLinesChart } from "@/components/TopAccountsLinesChart";

function buildProductTypeOptions(combineLmsAio: boolean, combineAuthor: boolean) {
  const options: { label: string; value: string; queryValues: string[] }[] = [
    { label: "Todas las lineas", value: "", queryValues: [] },
  ];
  if (combineLmsAio) {
    options.push({ label: "LMS & AIO", value: "LMS & AIO", queryValues: ["SaaS LMS", "SaaS AIO"] });
  } else {
    options.push({ label: "SaaS LMS", value: "SaaS LMS", queryValues: ["SaaS LMS"] });
    options.push({ label: "SaaS AIO", value: "SaaS AIO", queryValues: ["SaaS AIO"] });
  }
  options.push({ label: "SaaS Skills", value: "SaaS Skills", queryValues: ["SaaS Skills"] });
  options.push({ label: "SaaS Engage", value: "SaaS Engage", queryValues: ["SaaS Engage"] });
  if (combineAuthor) {
    options.push({ label: "Author (Total)", value: "Author (Total)", queryValues: ["SaaS Author", "Author Online"] });
  } else {
    options.push({ label: "SaaS Author", value: "SaaS Author", queryValues: ["SaaS Author"] });
    options.push({ label: "Author Online", value: "Author Online", queryValues: ["Author Online"] });
  }
  return options;
}

function summarizePeriods(months: string[]) {
  if (months.length === 0) return "Sin periodos";
  if (months.length === 1) return formatMonth(months[0]);
  return `${months.length} periodos: ${formatMonth(months[0])} - ${formatMonth(months[months.length - 1])}`;
}

export default function ClientsPage() {
  const { activeSnapshot } = useSnapshotContext();
  const { combineLmsAio, combineAuthor } = useBLGrouping();
  const { arrMode } = useARRMode();

  const [selectedBL, setSelectedBL] = useState("");
  const [periodSelection, setPeriodSelection] = useState<{ sourceKey: string; months: string[] }>({
    sourceKey: "",
    months: [],
  });

  const blOptions = buildProductTypeOptions(combineLmsAio, combineAuthor);
  const selectedOption = blOptions.find((o) => o.value === selectedBL) ?? blOptions[0];
  const productTypesParam = selectedOption.queryValues.join(",") || undefined;

  const { data: availableData } = useQuery({
    queryKey: ["arr-by-account-periods", activeSnapshot?.id, productTypesParam, arrMode],
    queryFn: () =>
      api.getARRByAccount({
        snapshot_id: activeSnapshot?.id,
        product_types: productTypesParam,
        mode: arrMode,
        limit: 1,
      }),
    enabled: !!activeSnapshot,
  });

  const availableMonths = useMemo(
    () => availableData?.months ?? [],
    [availableData?.months],
  );
  const availableMonthsKey = availableMonths.join("|");

  const selectedMonths = useMemo(() => {
    if (availableMonths.length === 0) return [];
    if (periodSelection.sourceKey === availableMonthsKey) {
      const valid = periodSelection.months.filter((month) => availableMonths.includes(month));
      if (valid.length > 0) return valid;
    }
    return availableMonths.slice(-6);
  }, [availableMonths, availableMonthsKey, periodSelection]);

  const selectedMonthsParam = selectedMonths.join(",");

  const { data, isLoading, error } = useQuery({
    queryKey: ["arr-by-account", activeSnapshot?.id, productTypesParam, selectedMonthsParam, arrMode],
    queryFn: () =>
      api.getARRByAccount({
        snapshot_id: activeSnapshot?.id,
        product_types: productTypesParam,
        months: selectedMonthsParam,
        mode: arrMode,
        limit: 20,
      }),
    enabled: !!activeSnapshot && selectedMonths.length > 0,
  });

  function toggleMonth(month: string) {
    const months = selectedMonths.includes(month)
      ? selectedMonths.length === 1
        ? selectedMonths
        : selectedMonths.filter((m) => m !== month)
      : [...selectedMonths, month].sort();
    setPeriodSelection({ sourceKey: availableMonthsKey, months });
  }

  function selectMarches() {
    const marchMonths = availableMonths.filter((month) => month.slice(5, 7) === "03");
    setPeriodSelection({
      sourceKey: availableMonthsKey,
      months: marchMonths.length > 0 ? marchMonths : availableMonths.slice(-6),
    });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1560px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <section className="overflow-hidden rounded-[2rem] bg-[#2f185f] p-6 text-white shadow-[0_30px_80px_rgba(49,24,95,0.22)] lg:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Building2 size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8caff]">Drill-down</p>
              <h1 className="text-3xl font-black tracking-tight">Analisis por Cliente</h1>
              <p className="mt-1 text-sm text-[#efe9ff]">Top 20 cuentas por ARR segun linea de negocio y periodo</p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-3xl border border-[#e7e1f2] bg-white p-4 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(420px,2fr)]">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
                <Layers3 size={15} />
                Linea de negocio
              </span>
              <select
                value={selectedBL}
                onChange={(e) => setSelectedBL(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
              >
                {blOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
                <CalendarRange size={15} />
                Periodos a mostrar
              </span>
              <details className="group relative">
                <summary className="flex h-12 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition marker:hidden focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10">
                  <span className="truncate">{summarizePeriods(selectedMonths)}</span>
                  <ChevronDown size={17} className="shrink-0 text-[#837a9f] transition group-open:rotate-180" />
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#e7e1f2] bg-white shadow-[0_24px_70px_rgba(49,24,95,0.18)]">
                  <div className="flex flex-wrap gap-2 border-b border-[#eee8f8] p-3">
                    <button
                      type="button"
                      onClick={() => setPeriodSelection({ sourceKey: availableMonthsKey, months: availableMonths.slice(-6) })}
                      disabled={availableMonths.length === 0}
                      className="rounded-xl bg-[#efe9ff] px-3 py-2 text-xs font-black text-[#2f185f] transition hover:bg-[#6d35ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ultimos 6
                    </button>
                    <button
                      type="button"
                      onClick={selectMarches}
                      disabled={availableMonths.length === 0}
                      className="rounded-xl bg-[#efe9ff] px-3 py-2 text-xs font-black text-[#2f185f] transition hover:bg-[#6d35ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Marzos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodSelection({ sourceKey: availableMonthsKey, months: availableMonths })}
                      disabled={availableMonths.length === 0}
                      className="rounded-xl bg-[#efe9ff] px-3 py-2 text-xs font-black text-[#2f185f] transition hover:bg-[#6d35ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Todos
                    </button>
                  </div>
                  <div className="grid max-h-72 gap-1 overflow-y-auto p-2 sm:grid-cols-2 xl:grid-cols-3">
                    {availableMonths.map((month) => {
                      const checked = selectedMonths.includes(month);
                      return (
                        <label
                          key={month}
                          className={`flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                            checked ? "bg-[#efe9ff] text-[#2f185f]" : "text-[#6f6a80] hover:bg-[#fbfaff]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMonth(month)}
                            className="sr-only"
                          />
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              checked ? "border-[#6d35ff] bg-[#6d35ff] text-white" : "border-[#d8cfe8] bg-white"
                            }`}
                          >
                            {checked && <Check size={13} strokeWidth={3} />}
                          </span>
                          <span className="truncate">{formatMonth(month)}</span>
                        </label>
                      );
                    })}
                    {availableMonths.length === 0 && (
                      <p className="px-3 py-4 text-sm font-semibold text-[#837a9f]">Sin periodos disponibles.</p>
                    )}
                  </div>
                </div>
              </details>
            </div>
          </div>
        </section>

        {!activeSnapshot && (
          <section className="rounded-3xl border border-[#e7e1f2] bg-white p-6">
            <p className="text-sm font-semibold text-[#837a9f]">Selecciona un snapshot para ver el analisis por cliente.</p>
          </section>
        )}

        {error && (
          <section className="rounded-3xl border border-[#ffd0cd] bg-[#fff0ef] p-5">
            <p className="text-sm font-bold text-[#b82f2a]">No se pudieron cargar los datos de clientes.</p>
          </section>
        )}

        {/* Chart on top, table below (full width) */}
        <ClientARRChart data={data} isLoading={isLoading && !!activeSnapshot} />
        <TopAccountsLinesChart data={data} isLoading={isLoading && !!activeSnapshot} />
        <ClientARRTable data={data} isLoading={isLoading && !!activeSnapshot} />
      </div>
    </div>
  );
}

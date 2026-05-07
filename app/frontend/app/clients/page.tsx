"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarRange, Layers3 } from "lucide-react";
import { api } from "@/lib/api";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { useBLGrouping } from "@/lib/bl-grouping-context";
import { applyBLGrouping } from "@/lib/utils";
import { ClientARRTable } from "@/components/ClientARRTable";
import { ClientARRChart } from "@/components/ClientARRChart";
import type { ARRByAccountResponse } from "@/lib/types";

const ALL_PRODUCT_TYPES = [
  "SaaS LMS",
  "SaaS AIO",
  "SaaS Author",
  "SaaS Engage",
  "SaaS Skills",
  "Author Online",
];

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

const DEFAULT_MONTH_FROM = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
})();
const DEFAULT_MONTH_TO = `${new Date().toISOString().slice(0, 7)}-01`;

export default function ClientsPage() {
  const { activeSnapshot } = useSnapshotContext();
  const { combineLmsAio, combineAuthor } = useBLGrouping();

  const [selectedBL, setSelectedBL] = useState("");
  const [monthFrom, setMonthFrom] = useState(DEFAULT_MONTH_FROM);
  const [monthTo, setMonthTo] = useState(DEFAULT_MONTH_TO);

  const blOptions = buildProductTypeOptions(combineLmsAio, combineAuthor);
  const selectedOption = blOptions.find((o) => o.value === selectedBL) ?? blOptions[0];
  const productTypesParam = selectedOption.queryValues.join(",") || undefined;

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["arr-by-account", activeSnapshot?.id, productTypesParam, monthFrom, monthTo],
    queryFn: () =>
      api.getARRByAccount({
        snapshot_id: activeSnapshot?.id,
        product_types: productTypesParam,
        month_from: monthFrom,
        month_to: monthTo,
        limit: 20,
      }),
    enabled: !!activeSnapshot,
  });

  // Apply BL grouping to by_month data if a combined option is selected
  const data: ARRByAccountResponse | undefined = useMemo(() => {
    if (!rawData || selectedOption.queryValues.length <= 1) return rawData;
    // If we queried multiple product types (combined BL), the accounts already have the sum
    // No additional transformation needed since the backend sums by account across types
    return rawData;
  }, [rawData, selectedOption]);

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
          <div className="grid gap-3 lg:grid-cols-3">
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

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
                <CalendarRange size={15} />
                Desde
              </span>
              <input
                type="month"
                value={monthFrom.slice(0, 7)}
                onChange={(e) => setMonthFrom(`${e.target.value}-01`)}
                className="h-12 w-full rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
                <CalendarRange size={15} />
                Hasta
              </span>
              <input
                type="month"
                value={monthTo.slice(0, 7)}
                onChange={(e) => setMonthTo(`${e.target.value}-01`)}
                className="h-12 w-full rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
              />
            </label>
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

        {/* Table + Chart */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ClientARRTable data={data} isLoading={isLoading && !!activeSnapshot} />
          <div className="hidden xl:block">
            <ClientARRChart data={data} isLoading={isLoading && !!activeSnapshot} />
          </div>
        </div>
        <div className="xl:hidden">
          <ClientARRChart data={data} isLoading={isLoading && !!activeSnapshot} />
        </div>
      </div>
    </div>
  );
}

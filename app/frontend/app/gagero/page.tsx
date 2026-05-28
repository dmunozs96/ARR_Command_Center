"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Download, Info } from "lucide-react";
import { GageroWaterfall } from "@/components/GageroWaterfall";
import { GageroSummaryTable } from "@/components/GageroSummaryTable";
import { GageroDetailTable } from "@/components/GageroDetailTable";
import { buildProductTypeOptions } from "@/components/FilterBar";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useARRMode } from "@/lib/arr-mode-context";
import { useBLGrouping } from "@/lib/bl-grouping-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { formatMonth, productTypeFilterParams } from "@/lib/utils";

type ComparisonMode = "mom" | "qoq" | "yoy" | "vs_year_close" | "free";
type CategoryKey = "new_logo" | "churn" | "up_selling" | "down_selling";

function subMonths(isoDate: string, n: number): string {
  const [y, m] = isoDate.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return d.toISOString().slice(0, 10);
}

function lastDecember(isoDate: string): string {
  const year = Number(isoDate.split("-")[0]);
  return `${year - 1}-12-01`;
}

function applyMode(mode: ComparisonMode, monthTo: string): { a: string; b: string } | null {
  switch (mode) {
    case "mom":           return { a: subMonths(monthTo, 1), b: monthTo };
    case "qoq":           return { a: subMonths(monthTo, 3), b: monthTo };
    case "yoy":           return { a: subMonths(monthTo, 12), b: monthTo };
    case "vs_year_close": return { a: lastDecember(monthTo), b: monthTo };
    case "free":          return null;
  }
}

const MODE_LABELS: Record<ComparisonMode, string> = {
  mom: "Mes anterior",
  qoq: "Trim. anterior",
  yoy: "Año anterior",
  vs_year_close: "Vs. cierre año",
  free: "Libre",
};

export default function GageroPage() {
  const { monthTo, productType, setProductType, accountName } = useAnalysisFilters();
  const { arrMode } = useARRMode();
  const { combineLmsAio, combineAuthor } = useBLGrouping();
  const { activeSnapshot } = useSnapshotContext();
  const productFilters = productTypeFilterParams(productType);
  const productTypeOptions = useMemo(
    () => buildProductTypeOptions(combineLmsAio, combineAuthor),
    [combineAuthor, combineLmsAio],
  );

  const [mode, setMode] = useState<ComparisonMode>("mom");
  const [freeMonthA, setFreeMonthA] = useState<string>(() => subMonths(monthTo, 1));
  const [freeMonthB, setFreeMonthB] = useState<string>(monthTo);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("new_logo");
  const [downloading, setDownloading] = useState(false);
  const calculatedMonths = applyMode(mode, monthTo);
  const monthA = calculatedMonths?.a ?? freeMonthA;
  const monthB = calculatedMonths?.b ?? freeMonthB;

  const bridgeQuery = useQuery({
    queryKey: ["gagero-bridge", activeSnapshot?.id, monthA, monthB, productType, accountName, arrMode],
    queryFn: () =>
      api.getGageroBridge({
        snapshot_id: activeSnapshot?.id,
        month_a: monthA,
        month_b: monthB,
        ...productFilters,
        account_name: accountName || undefined,
        mode: arrMode,
      }),
    enabled: !!(monthA && monthB && monthA !== monthB),
  });

  const data = bridgeQuery.data;
  const labelA = monthA ? formatMonth(monthA) : "Periodo A";
  const labelB = monthB ? formatMonth(monthB) : "Periodo B";

  const isCurrentMonth = monthB >= new Date().toISOString().slice(0, 7);

  async function handleExport() {
    if (!activeSnapshot?.id) return;
    setDownloading(true);
    try {
      await api.downloadGageroExcel(activeSnapshot.id, monthA, monthB, arrMode);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efe9ff] text-[#6d35ff]">
              <TrendingUp size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Análisis de Variaciones</p>
              <h1 className="text-2xl font-black tracking-tight text-[#151229]">Gagero</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-[#6f6a80]">
            Entiende por qué cambió el ARR entre dos periodos
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={!data || downloading || !activeSnapshot}
          className="flex items-center gap-2 rounded-xl bg-[#2f185f] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#3d2080] disabled:opacity-40 transition"
        >
          <Download size={16} />
          {downloading ? "Exportando..." : "Exportar Gagero (Excel)"}
        </button>
      </div>

      {/* Period selector */}
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Selector de periodos</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(MODE_LABELS) as ComparisonMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m === "free" && mode !== "free") {
                  setFreeMonthA(subMonths(monthTo, 1));
                  setFreeMonthB(monthTo);
                }
                setMode(m);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                mode === m
                  ? "bg-[#6d35ff] text-white"
                  : "bg-[#f4f0fb] text-[#6d35ff] hover:bg-[#efe9ff]"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex min-w-56 flex-col gap-1">
            <span className="text-xs font-semibold text-[#6f6a80]">Linea de negocio</span>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="rounded-lg border border-[#e7e1f2] px-3 py-2 text-sm font-semibold text-[#2f185f] focus:outline-none focus:ring-2 focus:ring-[#6d35ff]"
            >
              {productTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#6f6a80]">Periodo A</label>
            <input
              type="month"
              value={monthA.slice(0, 7)}
              disabled={mode !== "free"}
              onChange={(e) => setFreeMonthA(e.target.value + "-01")}
              className="rounded-lg border border-[#e7e1f2] px-3 py-2 text-sm font-semibold text-[#2f185f] focus:outline-none focus:ring-2 focus:ring-[#6d35ff] disabled:bg-[#f4f0fb] disabled:text-[#837a9f]"
            />
          </div>
          <span className="mt-5 font-bold text-[#6d35ff]">→</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#6f6a80]">Periodo B</label>
            <input
              type="month"
              value={monthB.slice(0, 7)}
              disabled={mode !== "free"}
              onChange={(e) => setFreeMonthB(e.target.value + "-01")}
              className="rounded-lg border border-[#e7e1f2] px-3 py-2 text-sm font-semibold text-[#2f185f] focus:outline-none focus:ring-2 focus:ring-[#6d35ff] disabled:bg-[#f4f0fb] disabled:text-[#837a9f]"
            />
          </div>
        </div>

        {isCurrentMonth && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[#f97316] font-semibold">
            <Info size={13} />
            El periodo B ({labelB}) puede no estar cerrado todavía
          </p>
        )}
      </section>

      {/* Content */}
      {bridgeQuery.isLoading && (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
        </div>
      )}

      {bridgeQuery.isError && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#ef4444]">
          No hay datos para los meses seleccionados. Verifica que el snapshot contiene datos en ambos periodos.
        </div>
      )}

      {data && !bridgeQuery.isLoading && (
        <>
          <GageroWaterfall data={data} labelA={labelA} labelB={labelB} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <GageroSummaryTable data={data} />
            <div className="flex flex-col gap-4 text-sm">
              <div className="rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] p-4 text-sm">
                <p className="font-bold text-[#2f185f]">Reconciliación</p>
                <p className="mt-1 text-[#6f6a80]">
                  ARR_A + New Logo − Churn + Up Selling − Down Selling = ARR_B
                </p>
              </div>
            </div>
          </div>

          <GageroDetailTable
            data={data}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </>
      )}
    </main>
  );
}

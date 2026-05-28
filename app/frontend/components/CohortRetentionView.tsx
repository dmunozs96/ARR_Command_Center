"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Gauge,
  LineChart,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAnalysisFilters } from "@/lib/analysis-filters-context";
import { useARRMode } from "@/lib/arr-mode-context";
import { useSnapshotContext } from "@/lib/snapshot-context";
import type { MonthlyChurnSummary, RenewalItem, RenewalMonthPoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth, productTypeFilterParams } from "@/lib/utils";

type Scenario = "base" | "conservative" | "aggressive";

type LineForecastModel = {
  productType: string;
  initialArr: number;
  trend: MonthlyChurnSummary[];
  renewalByMonth: RenewalMonthPoint[];
  renewalItems: RenewalItem[];
  rates: {
    churn: number;
    down: number;
    up: number;
  };
  projectedArr: number;
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  base: "Base",
  conservative: "Conservador",
  aggressive: "Agresivo",
};

function subMonths(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const zeroBased = year * 12 + month - 1 - amount;
  const resultYear = Math.floor(zeroBased / 12);
  const resultMonth = (zeroBased % 12) + 1;
  return `${resultYear}-${String(resultMonth).padStart(2, "0")}-01`;
}

function moveMonth(isoDate: string, amount: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const zeroBased = year * 12 + month - 1 + amount;
  const resultYear = Math.floor(zeroBased / 12);
  const resultMonth = (zeroBased % 12) + 1;
  return `${resultYear}-${String(resultMonth).padStart(2, "0")}-01`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signedEUR(value: number): string {
  return `${value >= 0 ? "+" : "-"}${formatEUR(Math.abs(value))}`;
}

function weightedRate(data: MonthlyChurnSummary[], key: "churn_arr" | "down_selling_arr" | "up_selling_arr"): number {
  const denominator = data.reduce((sum, point) => sum + point.arr_start, 0);
  if (!denominator) return 0;
  return data.reduce((sum, point) => sum + point[key], 0) / denominator;
}

function applyScenario(value: number, scenario: Scenario, type: "loss" | "gain"): number {
  if (scenario === "base") return value;
  if (scenario === "conservative") return type === "loss" ? value * 1.25 : value * 0.75;
  return type === "loss" ? value * 0.8 : value * 1.2;
}

function scenarioRatesFromTrend(data: MonthlyChurnSummary[], scenario: Scenario) {
  return {
    churn: applyScenario(weightedRate(data, "churn_arr"), scenario, "loss"),
    down: applyScenario(weightedRate(data, "down_selling_arr"), scenario, "loss"),
    up: applyScenario(weightedRate(data, "up_selling_arr"), scenario, "gain"),
  };
}

function ForecastCards({
  initialArr,
  churnRate,
  downRate,
  upRate,
}: {
  initialArr: number;
  churnRate: number;
  downRate: number;
  upRate: number;
}) {
  const churn = initialArr * churnRate;
  const down = initialArr * downRate;
  const up = initialArr * upRate;
  const projected = initialArr - churn - down + up;
  const netRate = initialArr ? (projected - initialArr) / initialArr : 0;
  const cards = [
    { label: "ARR inicial", value: formatEUR(initialArr), detail: "Base existente al mes de partida", className: "text-[#2f185f]" },
    { label: "Churn esperado 12M", value: `-${formatEUR(churn)}`, detail: pct(churnRate), className: "text-[#d03932]" },
    { label: "Downselling esperado", value: `-${formatEUR(down)}`, detail: pct(downRate), className: "text-[#f97316]" },
    { label: "Upselling esperado", value: `+${formatEUR(up)}`, detail: pct(upRate), className: "text-[#0c8f76]" },
    { label: "ARR base proyectado", value: formatEUR(projected), detail: signedEUR(projected - initialArr), className: "text-[#151229]" },
    { label: "Retencion neta usada", value: pct(1 + netRate), detail: "Sin pipeline ni new business", className: netRate >= 0 ? "text-[#0c8f76]" : "text-[#d03932]" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <section key={card.label} className="rounded-2xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#837a9f]">{card.label}</p>
          <p className={`mt-3 text-3xl font-black tracking-tight ${card.className}`}>{card.value}</p>
          <p className="mt-2 text-sm font-semibold text-[#6f6a80]">{card.detail}</p>
        </section>
      ))}
    </div>
  );
}

function AssumptionPanel({
  scenario,
  setScenario,
  churnRate,
  downRate,
  upRate,
  historyMonths,
}: {
  scenario: Scenario;
  setScenario: (value: Scenario) => void;
  churnRate: number;
  downRate: number;
  upRate: number;
  historyMonths: number;
}) {
  const rows = [
    { label: "Churn ARR", value: churnRate, tone: "text-[#d03932]", icon: TrendingDown },
    { label: "Downselling", value: downRate, tone: "text-[#f97316]", icon: TrendingDown },
    { label: "Upselling", value: upRate, tone: "text-[#0c8f76]", icon: TrendingUp },
  ];

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Supuestos para forecast</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Tasas derivadas de la base existente</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#6f6a80]">
            Media ponderada por ARR inicial de los ultimos {historyMonths} meses. El escenario ajusta perdidas y expansion para llevarlo directo al modelo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScenario(item)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                scenario === item ? "bg-[#6d35ff] text-white" : "bg-[#f4f0fb] text-[#6d35ff] hover:bg-[#efe9ff]"
              }`}
            >
              {SCENARIO_LABELS[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center justify-between rounded-2xl border border-[#f0ebf8] bg-[#fbfaff] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6d35ff]">
                  <Icon size={18} />
                </span>
                <p className="text-sm font-black text-[#2f185f]">{row.label}</p>
              </div>
              <p className={`text-lg font-black ${row.tone}`}>{pct(row.value)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ForecastBridge({
  initialArr,
  churn,
  down,
  up,
}: {
  initialArr: number;
  churn: number;
  down: number;
  up: number;
}) {
  const finalArr = initialArr - churn - down + up;
  const steps = [
    { name: "ARR inicial", value: initialArr, fill: "#2f185f", total: true },
    { name: "Churn", value: -churn, fill: "#d03932" },
    { name: "Downsell", value: -down, fill: "#f97316" },
    { name: "Upsell", value: up, fill: "#0c8f76" },
    { name: "ARR proyectado", value: finalArr, fill: "#6d35ff", total: true },
  ];
  let running = 0;
  const chartData = steps.map((step) => {
    if (step.total) {
      running = step.value;
      return { ...step, range: [0, step.value], displayValue: step.value };
    }
    const next = running + step.value;
    const range = [Math.min(running, next), Math.max(running, next)];
    running = next;
    return { ...step, range, displayValue: step.value };
  });

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Ecuacion de base instalada</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">ARR inicial - bajas - downsell + upsell</h2>
        </div>
        <p className="text-sm font-semibold text-[#6f6a80]">
          Variacion neta: <span className={finalArr >= initialArr ? "font-black text-[#0c8f76]" : "font-black text-[#d03932]"}>{signedEUR(finalArr - initialArr)}</span>
        </p>
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <BarChart data={chartData} margin={{ top: 28, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 700 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
          <Tooltip
            formatter={(_value, _name, props) => {
              const payload = props.payload as { displayValue: number; total?: boolean };
              return [payload.total ? formatEUR(payload.displayValue) : signedEUR(payload.displayValue), "ARR"];
            }}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
          />
          <Bar dataKey="range" radius={[8, 8, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

function HistoricalTable({ data }: { data: MonthlyChurnSummary[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="border-b border-[#e7e1f2] p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Historico que alimenta el supuesto</p>
        <p className="mt-1 text-sm font-semibold text-[#6f6a80]">Movimientos de base existente, excluyendo el efecto comercial de new business.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-[#fbfaff] text-left text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
            <tr>
              <th className="px-5 py-3">Mes</th>
              <th className="px-5 py-3 text-right">ARR inicio</th>
              <th className="px-5 py-3 text-right">Churn</th>
              <th className="px-5 py-3 text-right">Downsell</th>
              <th className="px-5 py-3 text-right">Upsell</th>
              <th className="px-5 py-3 text-right">NRR</th>
              <th className="px-5 py-3 text-right">Cambio neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ebf8]">
            {data.map((point) => (
              <tr key={point.month}>
                <td className="px-5 py-3 font-semibold text-[#2f185f]">{formatMonth(point.month)}</td>
                <td className="px-5 py-3 text-right text-[#6f6a80]">{formatEUR(point.arr_start)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#d03932]">-{formatEUR(point.churn_arr)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#f97316]">-{formatEUR(point.down_selling_arr)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#0c8f76]">+{formatEUR(point.up_selling_arr)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#2f185f]">{point.nrr.toFixed(1)}%</td>
                <td className={`px-5 py-3 text-right font-bold ${point.net_existing_change >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}`}>
                  {signedEUR(point.net_existing_change)}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center font-semibold text-[#837a9f]">
                  No hay historico suficiente para derivar supuestos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RenewalRisk({
  byMonth,
  items,
  churnRate,
  downRate,
}: {
  byMonth: RenewalMonthPoint[];
  items: RenewalItem[];
  churnRate: number;
  downRate: number;
}) {
  const chartData = byMonth.map((point) => ({
    ...point,
    label: formatMonth(point.month),
    expected_churn: point.at_risk_arr * churnRate,
    expected_down: point.at_risk_arr * downRate,
  }));
  const topRisk = [...items]
    .filter((item) => item.status === "at_risk")
    .sort((a, b) => b.current_arr - a.current_arr)
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Riesgo futuro por renovaciones</p>
        <p className="mt-1 text-sm font-semibold text-[#6f6a80]">Aplica las tasas historicas sobre el ARR pendiente de renovar cada mes.</p>
        {chartData.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm font-semibold text-[#837a9f]">
            No hay vencimientos en los proximos 12 meses.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 22, right: 20, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
              <Tooltip
                formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
                labelStyle={{ color: "#151229", fontWeight: 800 }}
                contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
              />
              <Bar dataKey="expected_churn" name="Churn esperado" fill="#d03932" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expected_down" name="Downsell esperado" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="renewed_arr" name="Ya renovado" fill="#0c8f76" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="border-b border-[#e7e1f2] p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Top riesgo</p>
          <p className="mt-1 text-sm font-semibold text-[#6f6a80]">{topRisk.length} contratos con mayor ARR pendiente.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fbfaff] text-left text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">BL</th>
                <th className="px-5 py-3 text-right">ARR</th>
                <th className="px-5 py-3">Vence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebf8]">
              {topRisk.map((item) => (
                <tr key={`${item.account_name}-${item.product_type}-${item.expiry_month}`}>
                  <td className="px-5 py-3 font-semibold text-[#2f185f]">{item.account_name}</td>
                  <td className="px-5 py-3 text-[#6f6a80]">{item.product_type}</td>
                  <td className="px-5 py-3 text-right font-bold text-[#d03932]">{formatEUR(item.current_arr)}</td>
                  <td className="px-5 py-3 text-[#6f6a80]">{formatMonth(item.expiry_month)}</td>
                </tr>
              ))}
              {topRisk.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center font-semibold text-[#837a9f]">
                    No hay contratos en riesgo en el horizonte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BusinessLineForecastSection({
  lines,
  selectedLine,
  setSelectedLine,
  scenario,
}: {
  lines: LineForecastModel[];
  selectedLine: string;
  setSelectedLine: (line: string) => void;
  scenario: Scenario;
}) {
  const activeLine = lines.find((line) => line.productType === selectedLine) ?? lines[0];

  if (lines.length === 0 || !activeLine) {
    return (
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
        No hay lineas de negocio con ARR para desglosar el modelo.
      </section>
    );
  }

  const activeChurn = activeLine.initialArr * activeLine.rates.churn;
  const activeDown = activeLine.initialArr * activeLine.rates.down;
  const activeUp = activeLine.initialArr * activeLine.rates.up;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[#e7e1f2] bg-[#fbfaff] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Modelo por linea de negocio</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Misma logica, bajada a cada BL</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#6f6a80]">
              Compara el ARR inicial, el ARR base proyectado y las tasas usadas por linea. El filtro local de abajo cambia todo el detalle sin alterar el filtro global.
            </p>
          </div>
          <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#2f185f]">
            Escenario {SCENARIO_LABELS[scenario]}
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="border-b border-[#e7e1f2] p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Comparativa por BL</p>
          <p className="mt-1 text-sm font-semibold text-[#6f6a80]">{lines.length} lineas con ARR inicial en el mes seleccionado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-[#fbfaff] text-left text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
              <tr>
                <th className="px-5 py-3">Linea</th>
                <th className="px-5 py-3 text-right">ARR inicial</th>
                <th className="px-5 py-3 text-right">Churn rate</th>
                <th className="px-5 py-3 text-right">Downsell rate</th>
                <th className="px-5 py-3 text-right">Upsell rate</th>
                <th className="px-5 py-3 text-right">ARR proyectado</th>
                <th className="px-5 py-3 text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebf8]">
              {lines.map((line) => {
                const delta = line.projectedArr - line.initialArr;
                return (
                  <tr key={line.productType}>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedLine(line.productType)}
                        className={`rounded-lg px-3 py-2 text-left font-bold transition ${
                          activeLine.productType === line.productType
                            ? "bg-[#efe9ff] text-[#2f185f]"
                            : "text-[#2f185f] hover:bg-[#f7f3ff]"
                        }`}
                      >
                        {line.productType}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right text-[#6f6a80]">{formatEUR(line.initialArr)}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#d03932]">{pct(line.rates.churn)}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#f97316]">{pct(line.rates.down)}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#0c8f76]">{pct(line.rates.up)}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#2f185f]">{formatEUR(line.projectedArr)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${delta >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}`}>
                      {signedEUR(delta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Filtro de linea</p>
        <div className="flex flex-wrap gap-2">
          {lines.map((line) => (
            <button
              key={line.productType}
              type="button"
              onClick={() => setSelectedLine(line.productType)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                activeLine.productType === line.productType
                  ? "bg-[#6d35ff] text-white"
                  : "bg-[#f4f0fb] text-[#6d35ff] hover:bg-[#efe9ff]"
              }`}
            >
              {line.productType}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#e7e1f2] bg-[#fbfaff] p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Detalle por BL</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">{activeLine.productType}</h2>
        <p className="mt-1 text-sm font-semibold text-[#6f6a80]">
          Forecast aislado de esta linea: ARR inicial, churn, downselling, upselling, riesgo de renovacion e historico propio.
        </p>
      </section>

      <ForecastCards
        initialArr={activeLine.initialArr}
        churnRate={activeLine.rates.churn}
        downRate={activeLine.rates.down}
        upRate={activeLine.rates.up}
      />
      <ForecastBridge initialArr={activeLine.initialArr} churn={activeChurn} down={activeDown} up={activeUp} />
      <RenewalRisk
        byMonth={activeLine.renewalByMonth}
        items={activeLine.renewalItems}
        churnRate={activeLine.rates.churn}
        downRate={activeLine.rates.down}
      />
      <HistoricalTable data={activeLine.trend} />
    </section>
  );
}

export function CohortRetentionView() {
  const { monthTo, productType, accountName } = useAnalysisFilters();
  const { arrMode } = useARRMode();
  const { activeSnapshot } = useSnapshotContext();
  const [selectedMonthOverride, setSelectedMonthOverride] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario>("base");
  const [selectedLine, setSelectedLine] = useState("");
  const selectedMonth = selectedMonthOverride ?? monthTo;
  const productFilters = productTypeFilterParams(productType);
  const commonParams = {
    snapshot_id: activeSnapshot?.id,
    ...productFilters,
    account_name: accountName || undefined,
  };
  const allLinesParams = {
    snapshot_id: activeSnapshot?.id,
    account_name: accountName || undefined,
  };

  const arrQuery = useQuery({
    queryKey: ["installed-base-arr", activeSnapshot?.id, selectedMonth, productType, accountName, arrMode],
    queryFn: () =>
      api.getARRSummary({
        ...commonParams,
        month_from: selectedMonth,
        month_to: selectedMonth,
        mode: arrMode,
      }),
    enabled: !!activeSnapshot,
  });
  const trendQuery = useQuery({
    queryKey: ["installed-base-churn-trend", activeSnapshot?.id, selectedMonth, productType, accountName, arrMode],
    queryFn: () =>
      api.getChurnMonthlyTrend({
        ...commonParams,
        month_from: subMonths(selectedMonth, 11),
        month_to: selectedMonth,
        mode: arrMode,
      }),
    enabled: !!activeSnapshot,
  });
  const renewalQuery = useQuery({
    queryKey: ["installed-base-renewals", activeSnapshot?.id, selectedMonth, productType, accountName],
    queryFn: () =>
      api.getRenewalMonitor({
        ...commonParams,
        horizon_months: 12,
      }),
    enabled: !!activeSnapshot,
  });
  const allLinesArrQuery = useQuery({
    queryKey: ["installed-base-all-lines-arr", activeSnapshot?.id, selectedMonth, accountName, arrMode],
    queryFn: () =>
      api.getARRSummary({
        ...allLinesParams,
        month_from: selectedMonth,
        month_to: selectedMonth,
        mode: arrMode,
      }),
    enabled: !!activeSnapshot,
  });

  const initialArr = arrQuery.data?.months[0]?.total_arr ?? 0;
  const trend = useMemo(() => trendQuery.data?.data ?? [], [trendQuery.data?.data]);
  const baseRates = useMemo(
    () => ({
      churn: weightedRate(trend, "churn_arr"),
      down: weightedRate(trend, "down_selling_arr"),
      up: weightedRate(trend, "up_selling_arr"),
    }),
    [trend],
  );
  const scenarioRates = {
    churn: applyScenario(baseRates.churn, scenario, "loss"),
    down: applyScenario(baseRates.down, scenario, "loss"),
    up: applyScenario(baseRates.up, scenario, "gain"),
  };
  const churn = initialArr * scenarioRates.churn;
  const down = initialArr * scenarioRates.down;
  const up = initialArr * scenarioRates.up;
  const productLines = useMemo(() => {
    const byProductType = allLinesArrQuery.data?.months[0]?.by_product_type ?? {};
    return Object.entries(byProductType)
      .filter(([, value]) => Number(value) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([line]) => line);
  }, [allLinesArrQuery.data?.months]);
  const lineTrendQueries = useQueries({
    queries: productLines.map((line) => ({
      queryKey: ["installed-base-line-trend", activeSnapshot?.id, selectedMonth, accountName, arrMode, line],
      queryFn: () =>
        api.getChurnMonthlyTrend({
          ...allLinesParams,
          product_type: line,
          month_from: subMonths(selectedMonth, 11),
          month_to: selectedMonth,
          mode: arrMode,
        }),
      enabled: !!activeSnapshot,
    })),
  });
  const lineRenewalQueries = useQueries({
    queries: productLines.map((line) => ({
      queryKey: ["installed-base-line-renewals", activeSnapshot?.id, selectedMonth, accountName, line],
      queryFn: () =>
        api.getRenewalMonitor({
          ...allLinesParams,
          product_type: line,
          horizon_months: 12,
        }),
      enabled: !!activeSnapshot,
    })),
  });
  const lineModels = useMemo<LineForecastModel[]>(() => {
    const byProductType = allLinesArrQuery.data?.months[0]?.by_product_type ?? {};
    return productLines.map((line, index) => {
      const lineTrend = lineTrendQueries[index]?.data?.data ?? [];
      const lineRates = scenarioRatesFromTrend(lineTrend, scenario);
      const lineInitialArr = Number(byProductType[line] ?? 0);
      return {
        productType: line,
        initialArr: lineInitialArr,
        trend: lineTrend,
        renewalByMonth: lineRenewalQueries[index]?.data?.by_month ?? [],
        renewalItems: lineRenewalQueries[index]?.data?.items ?? [],
        rates: lineRates,
        projectedArr: lineInitialArr - lineInitialArr * lineRates.churn - lineInitialArr * lineRates.down + lineInitialArr * lineRates.up,
      };
    });
  }, [allLinesArrQuery.data?.months, lineRenewalQueries, lineTrendQueries, productLines, scenario]);
  const currentSelectedLine = selectedLine && productLines.includes(selectedLine) ? selectedLine : productLines[0] ?? "";
  const linesAreLoading =
    allLinesArrQuery.isLoading || lineTrendQueries.some((query) => query.isLoading) || lineRenewalQueries.some((query) => query.isLoading);
  const linesHaveError =
    allLinesArrQuery.isError || lineTrendQueries.some((query) => query.isError) || lineRenewalQueries.some((query) => query.isError);

  return (
    <>
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
              <CalendarRange size={15} />
              Mes de partida del forecast
            </span>
            <input
              type="month"
              value={selectedMonth.slice(0, 7)}
              onChange={(event) => setSelectedMonthOverride(`${event.target.value}-01`)}
              className="h-11 rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonthOverride(moveMonth(selectedMonth, -1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0fb] text-[#6d35ff] transition hover:bg-[#efe9ff]"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonthOverride(moveMonth(selectedMonth, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0fb] text-[#6d35ff] transition hover:bg-[#efe9ff]"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {!activeSnapshot && (
        <div className="rounded-3xl border border-[#e7e1f2] bg-white p-6 text-sm font-semibold text-[#837a9f]">
          Selecciona un snapshot para modelizar la base instalada.
        </div>
      )}

      {(arrQuery.isLoading || trendQuery.isLoading) && activeSnapshot && (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
        </div>
      )}

      {(arrQuery.isError || trendQuery.isError) && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
          No se han podido calcular los supuestos predictivos para el periodo seleccionado.
        </div>
      )}

      {activeSnapshot && !arrQuery.isLoading && !trendQuery.isLoading && !arrQuery.isError && !trendQuery.isError && (
        <>
          <section className="rounded-3xl border border-[#e7e1f2] bg-[#fbfaff] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Modelo de revenue predictivo</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Base existente de {formatMonth(selectedMonth)}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6f6a80]">
                  Esta vista no incluye pipeline, CAC, marketing ni nuevo negocio. Solo transforma ARR actual en churn, downsell y upsell esperados.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[#2f185f]">
                  <Gauge size={16} />
                  {SCENARIO_LABELS[scenario]}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[#2f185f]">
                  <Target size={16} />
                  12 meses
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[#2f185f]">
                  <LineChart size={16} />
                  Historico LTM
                </span>
              </div>
            </div>
          </section>

          <AssumptionPanel
            scenario={scenario}
            setScenario={setScenario}
            churnRate={scenarioRates.churn}
            downRate={scenarioRates.down}
            upRate={scenarioRates.up}
            historyMonths={trend.length}
          />

          <ForecastCards initialArr={initialArr} churnRate={scenarioRates.churn} downRate={scenarioRates.down} upRate={scenarioRates.up} />

          <ForecastBridge initialArr={initialArr} churn={churn} down={down} up={up} />

          {renewalQuery.isLoading ? (
            <div className="flex h-[300px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
            </div>
          ) : renewalQuery.isError ? (
            <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
              No se ha podido cargar el riesgo futuro por renovaciones.
            </div>
          ) : (
            <RenewalRisk
              byMonth={renewalQuery.data?.by_month ?? []}
              items={renewalQuery.data?.items ?? []}
              churnRate={scenarioRates.churn}
              downRate={scenarioRates.down}
            />
          )}

          <HistoricalTable data={trend} />

          {linesAreLoading ? (
            <div className="flex h-[300px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
            </div>
          ) : linesHaveError ? (
            <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm font-semibold text-[#d03932]">
              No se han podido cargar los analisis por linea de negocio.
            </div>
          ) : (
            <BusinessLineForecastSection
              lines={lineModels}
              selectedLine={currentSelectedLine}
              setSelectedLine={setSelectedLine}
              scenario={scenario}
            />
          )}
        </>
      )}
    </>
  );
}

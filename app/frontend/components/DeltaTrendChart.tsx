"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DeltaMonthPoint, TrendNote } from "@/lib/types";
import { formatCompactEUR, formatMonth } from "@/lib/utils";
import { PRODUCT_TYPE_COLORS } from "@/lib/constants";

const TREND_MESSAGES: Record<TrendNote, string> = {
  ascendente:
    "El gap lleva creciendo en los últimos 3 meses. Puede indicar aceleración comercial o retraso en implementaciones.",
  descendente:
    "El gap se está reduciendo. Las implementaciones avanzan más rápido que los nuevos cierres.",
  estable:
    "El gap se mantiene estable. El ritmo de cierres y el de implementaciones están equilibrados.",
  mixta: "El gap muestra variaciones sin tendencia clara.",
};

interface Props {
  months: DeltaMonthPoint[];
  trendNote: TrendNote;
  productType?: string;
}

export function DeltaTrendChart({ months, trendNote, productType }: Props) {
  const allBLs = Array.from(
    new Set(months.flatMap((m) => Object.keys(m.delta_by_product_type)))
  );

  const chartData = months.map((m) => ({
    month: m.month,
    real_arr: m.real_arr,
    ...Object.fromEntries(allBLs.map((bl) => [bl, m.delta_by_product_type[bl] ?? 0])),
  }));

  const maxDelta = Math.max(...months.map((m) => m.delta_total), 1);
  const maxReal = Math.max(...months.map((m) => m.real_arr), 1);
  const realScale = maxDelta / maxReal;

  const isEmpty = months.every((m) => m.delta_total === 0 && m.committed_arr === 0);

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
        <h2 className="text-base font-bold text-[#2f185f]">Tendencia del Gap Committed vs Real</h2>
        <p className="mt-6 text-center text-sm text-[#9ca3af]">
          No hay datos de fecha de cierre en este snapshot. El cálculo del delta requiere el campo{" "}
          <code>close_date</code> de Salesforce.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
      <h2 className="text-base font-bold text-[#2f185f]">Tendencia del Gap Committed vs Real</h2>

      <ResponsiveContainer width="100%" height={300} className="mt-4">
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ebff" />
          <XAxis
            dataKey="month"
            tickFormatter={(v: string) => formatMonth(v)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <YAxis
            yAxisId="delta"
            tickFormatter={(v: number) => formatCompactEUR(v)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            width={72}
          />
          <YAxis
            yAxisId="real"
            orientation="right"
            tickFormatter={(v: number) => formatCompactEUR(v / realScale)}
            tick={{ fontSize: 10, fill: "#c4b5fd" }}
            width={68}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "real_arr") return [formatCompactEUR(value), "Real ARR"];
              return [formatCompactEUR(value), name];
            }}
            labelFormatter={(label: string) => formatMonth(label)}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {productType ? (
            <Bar
              yAxisId="delta"
              dataKey={productType}
              fill={PRODUCT_TYPE_COLORS[productType] ?? "#6d35ff"}
              radius={[4, 4, 0, 0]}
            />
          ) : (
            allBLs.map((bl) => (
              <Bar
                key={bl}
                yAxisId="delta"
                dataKey={bl}
                stackId="delta"
                fill={PRODUCT_TYPE_COLORS[bl] ?? "#6f6a80"}
              />
            ))
          )}
          <Line
            yAxisId="real"
            type="monotone"
            dataKey="real_arr"
            stroke="#9ca3af"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-[#9ca3af]">{TREND_MESSAGES[trendNote]}</p>
    </div>
  );
}

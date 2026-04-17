"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ARRMonthPoint } from "@/lib/types";
import { formatEUR, formatMonth, productTypeColor } from "@/lib/utils";

interface Props {
  months: ARRMonthPoint[];
  loading: boolean;
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M€`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K€`;
  return `${value}€`;
}

export function ARRChart({ months, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 h-72 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Cargando gráfico…</div>
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 h-72 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Sin datos</div>
      </div>
    );
  }

  // Collect all product types present
  const productTypes = Array.from(
    new Set(months.flatMap((m) => Object.keys(m.by_product_type)))
  ).filter((pt) => pt !== "null" && pt !== "undefined");

  // Build chart data
  const data = months.map((m) => ({
    month: formatMonth(m.month),
    total: m.total_arr,
    ...Object.fromEntries(
      productTypes.map((pt) => [pt, m.by_product_type[pt] ?? 0])
    ),
  }));

  const useSingleLine = productTypes.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Evolución ARR por línea de negocio
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {useSingleLine ? (
            <Line
              type="monotone"
              dataKey="total"
              name="ARR Total"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          ) : (
            productTypes.map((pt) => (
              <Line
                key={pt}
                type="monotone"
                dataKey={pt}
                name={pt}
                stroke={productTypeColor(pt)}
                strokeWidth={2}
                dot={false}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

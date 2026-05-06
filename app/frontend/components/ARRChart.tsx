"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ARRMonthPoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth, productTypeColor } from "@/lib/utils";

interface Props {
  months: ARRMonthPoint[];
  loading: boolean;
}

function formatYAxis(value: number): string {
  return formatCompactEUR(value).replace("€", " EUR");
}

export function ARRChart({ months, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 text-sm font-semibold text-[#837a9f] shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        Sin datos para el periodo seleccionado.
      </div>
    );
  }

  const productTypes = Array.from(new Set(months.flatMap((m) => Object.keys(m.by_product_type))))
    .filter((pt) => pt !== "null" && pt !== "undefined")
    .slice(0, 7);

  const data = months.map((m) => ({
    month: formatMonth(m.month),
    total: m.total_arr,
    ...Object.fromEntries(productTypes.map((pt) => [pt, m.by_product_type[pt] ?? 0])),
  }));

  const useSingleArea = productTypes.length === 0;

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">
            Tendencia financiera
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">
            Evolucion ARR por linea de negocio
          </h2>
        </div>
        <p className="text-sm text-[#6f6a80]">{months.length} meses analizados</p>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="totalArr" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#6d35ff" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#6d35ff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip
            formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 18,
              border: "1px solid #e7e1f2",
              boxShadow: "0 18px 50px rgba(49,24,95,0.12)",
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }} />
          {useSingleArea ? (
            <Area
              type="monotone"
              dataKey="total"
              name="ARR Total"
              stroke="#6d35ff"
              strokeWidth={3}
              fill="url(#totalArr)"
              dot={false}
              activeDot={{ r: 5 }}
            />
          ) : (
            productTypes.map((pt) => (
              <Area
                key={pt}
                type="monotone"
                dataKey={pt}
                name={pt}
                stroke={productTypeColor(pt)}
                strokeWidth={2.5}
                fill={productTypeColor(pt)}
                fillOpacity={0.08}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))
          )}
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PRODUCT_TYPE_COLORS } from "@/lib/constants";
import type { ChurnByProductTypePoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth } from "@/lib/utils";

type Props = {
  data: ChurnByProductTypePoint[];
};

export function ChurnByBLChart({ data }: Props) {
  const productTypes = Array.from(new Set(data.flatMap((point) => Object.keys(point.by_product_type))));
  const chartData = data.map((point) => ({
    month: formatMonth(point.month),
    ...point.by_product_type,
  }));

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Churn por linea de negocio</p>
      {productTypes.length === 0 ? (
        <div className="flex h-[250px] items-center justify-center text-sm font-semibold text-[#837a9f]">
          No se han registrado bajas en el periodo visible.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 22, right: 20, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
              labelStyle={{ color: "#151229", fontWeight: 800 }}
              contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
            />
            {productTypes.map((productType) => (
              <Bar key={productType} dataKey={productType} stackId="churn" fill={PRODUCT_TYPE_COLORS[productType] ?? "#837a9f"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

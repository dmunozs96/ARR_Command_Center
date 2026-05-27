"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RenewalMonthPoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth } from "@/lib/utils";

type Props = {
  data: RenewalMonthPoint[];
};

export function RenewalsByMonthChart({ data }: Props) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }));

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Vencimientos por mes</p>
      {chartData.length === 0 ? (
        <div className="flex h-[250px] items-center justify-center text-sm font-semibold text-[#837a9f]">
          No hay vencimientos dentro del horizonte seleccionado.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 22, right: 20, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => formatCompactEUR(value)} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
              labelStyle={{ color: "#151229", fontWeight: 800 }}
              contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
            />
            <Bar dataKey="at_risk_arr" name="En riesgo" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="renewed_arr" name="Renovado" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChurnRollingPoint } from "@/lib/types";
import { formatEUR, formatMonth } from "@/lib/utils";

type Props = {
  data: ChurnRollingPoint[];
};

export function ChurnRollingChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <section className="flex h-[300px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 text-sm font-semibold text-[#837a9f]">
        No hay historico suficiente para calcular esta ventana.
      </section>
    );
  }

  const chartData = data.map((point) => ({ ...point, label: formatMonth(point.month) }));

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Evolucion rolling NRR / GRR</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 22, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }} tickLine={false} axisLine={false} width={56} />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" />
          <Tooltip
            formatter={(value, name, item) => {
              if (name === "NRR" || name === "GRR") return [`${Number(value).toFixed(1)}%`, name];
              return [formatEUR(item.payload.churned_arr), "ARR churneado"];
            }}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{ fontSize: 12, borderRadius: 18, border: "1px solid #e7e1f2" }}
          />
          <Line type="monotone" dataKey="nrr" name="NRR" stroke="#6d35ff" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="grr" name="GRR" stroke="#9ca3af" strokeDasharray="6 5" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTotalPoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth } from "@/lib/utils";

interface Props {
  data: MonthlyTotalPoint[];
  isLoading: boolean;
  onSelectMonth: (month: string) => void;
}

type ChartSelection = {
  activePayload?: Array<{ payload?: MonthlyTotalPoint }>;
};

export function SnapshotComparisonChart({ data, isLoading, onSelectMonth }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-[390px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[390px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white text-sm font-semibold text-[#837a9f]">
        No hay meses comunes para comparar con los filtros actuales.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Evolucion historica</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">ARR mensual entre snapshots</h2>
        <p className="mt-1 text-sm text-[#6f6a80]">Selecciona un punto para revisar sus line items.</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 20, bottom: 8, left: 0 }}
          onClick={(state) => {
            const point = (state as ChartSelection | undefined)?.activePayload?.[0]?.payload;
            if (point?.month) onSelectMonth(point.month);
          }}
        >
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatCompactEUR(Number(value)).replace("EUR", "")}
            tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={82}
          />
          <Tooltip
            labelFormatter={(label) => formatMonth(String(label))}
            formatter={(value, name) => [formatEUR(Number(value)), String(name)]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 18,
              border: "1px solid #e7e1f2",
              boxShadow: "0 18px 50px rgba(49,24,95,0.12)",
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }} />
          <Line
            type="monotone"
            dataKey="arr_a"
            name="Snapshot A"
            stroke="#9ca3af"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            connectNulls={false}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="arr_b"
            name="Snapshot B"
            stroke="#6d35ff"
            strokeWidth={3}
            connectNulls={false}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

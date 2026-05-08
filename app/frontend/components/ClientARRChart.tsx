"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactEUR, formatEUR } from "@/lib/utils";
import type { ARRByAccountResponse } from "@/lib/types";

interface Props {
  data: ARRByAccountResponse | undefined;
  isLoading: boolean;
}

const CHART_COLORS = [
  "#6d35ff", "#20c7a8", "#ff5f57", "#ffb020", "#c83cff", "#3557ff",
  "#00a7d8", "#f97316", "#84cc16", "#ec4899", "#14b8a6", "#a855f7",
  "#ef4444", "#0ea5e9", "#22c55e", "#eab308", "#6366f1", "#f43f5e",
  "#8b5cf6", "#06b6d4",
];

export function ClientARRChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 text-sm font-semibold text-[#837a9f] shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        Sin datos para mostrar.
      </div>
    );
  }

  const { months, accounts } = data;

  const chartData = months.map((m) => {
    const point: Record<string, unknown> = { month: m.slice(0, 7) };
    for (const acct of accounts) {
      point[acct.account_name] = acct.by_month[m] ?? 0;
    }
    return point;
  });

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Evolucion</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">ARR por cliente y mes</h2>
        <p className="mt-1 text-xs text-[#837a9f]">Top 20 cuentas por ARR. El resto se omite para mayor claridad.</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCompactEUR(v).replace("€", " EUR")}
            tick={{ fontSize: 11, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{
              fontSize: 11,
              borderRadius: 18,
              border: "1px solid #e7e1f2",
              boxShadow: "0 18px 50px rgba(49,24,95,0.12)",
              maxHeight: 320,
              overflowY: "auto",
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 16 }}
          />
          {accounts.map((acct, idx) => (
            <Bar
              key={acct.account_name}
              dataKey={acct.account_name}
              stackId="a"
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

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
import type { ARRByAccountResponse } from "@/lib/types";
import { ACCOUNT_COLORS } from "@/lib/constants";
import { formatCompactEUR, formatEUR, formatMonth } from "@/lib/utils";

interface Props {
  data: ARRByAccountResponse | undefined;
  isLoading: boolean;
}

export function TopAccountsLinesChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 text-sm font-semibold text-[#837a9f] shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        Sin datos de clientes para el periodo seleccionado.
      </div>
    );
  }

  const TOP_EXCLUDE = /^(otros|resto\b|resto de clientes)/i;
  const visibleAccounts = data.accounts.filter(
    (a) => !TOP_EXCLUDE.test(a.account_name.trim()),
  );

  const chartData = data.months.map((month) => {
    const point: Record<string, number | string> = { month: formatMonth(month) };
    visibleAccounts.forEach((acc) => {
      point[acc.account_name] = acc.by_month[month] ?? 0;
    });
    return point;
  });

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Tendencia</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Evolución ARR top 20 clientes</h2>
        <p className="mt-1 text-xs text-[#837a9f]">Top 20 cuentas por ARR. El resto se omite para mayor claridad.</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCompactEUR(v).replace("€", " EUR")}
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
              maxHeight: 320,
              overflowY: "auto",
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }} />
          {visibleAccounts.map((acc, i) => (
            <Line
              key={acc.account_name}
              type="monotone"
              dataKey={acc.account_name}
              stroke={ACCOUNT_COLORS[i] ?? "#9ca3af"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

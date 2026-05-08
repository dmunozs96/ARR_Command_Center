"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ARRMonthPoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth, formatPct } from "@/lib/utils";

interface Props {
  months: ARRMonthPoint[];
  loading: boolean;
}

export function ARRTotalChart({ months, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#6d35ff]" />
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-3xl border border-[#e7e1f2] bg-white p-5 text-sm font-semibold text-[#837a9f] shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        Sin datos para el periodo seleccionado.
      </div>
    );
  }

  const lastMonth = months[months.length - 1];
  const lastTotal = Number(lastMonth?.total_arr ?? 0);
  const lastMomPct = lastMonth?.mom_pct ?? null;

  const data = months.map((m) => ({
    month: formatMonth(m.month),
    total: Number(m.total_arr),
  }));

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">ARR Total Compania</h2>
          <div className="mt-1 flex items-baseline gap-3">
            <p className="text-2xl font-black tracking-tight text-[#151229]">{formatEUR(lastTotal)}</p>
            {lastMomPct != null && (
              <span className={`text-sm font-black ${lastMomPct >= 0 ? "text-[#0c8f76]" : "text-[#d03932]"}`}>
                {formatPct(lastMomPct)} MoM
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-[#6f6a80]">{months.length} meses analizados</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="arrTotalGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#6d35ff" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#6d35ff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            width={78}
          />
          <Tooltip
            formatter={(value) => [formatEUR(Number(value ?? 0)), "ARR Total"]}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 18,
              border: "1px solid #e7e1f2",
              boxShadow: "0 18px 50px rgba(49,24,95,0.12)",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="ARR Total"
            stroke="#6d35ff"
            strokeWidth={3}
            fill="url(#arrTotalGrad)"
            dot={false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

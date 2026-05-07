"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ARRMonthPoint } from "@/lib/types";
import { formatCompactEUR, formatEUR, formatMonth } from "@/lib/utils";

interface Props {
  months: ARRMonthPoint[];
  monthTo: string; // "YYYY-MM-DD"
  loading: boolean;
}

function findMonth(months: ARRMonthPoint[], prefix: string): ARRMonthPoint | undefined {
  return months.find((m) => m.month.startsWith(prefix));
}

export function ARRYearBarsChart({ months, monthTo, loading }: Props) {
  if (loading || months.length === 0) return null;

  const milestones: { label: string; month: string; arr: number }[] = [];

  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    const dec = findMonth(months, `${year}-12`);
    if (dec) milestones.push({ label: `Dic ${year}`, month: dec.month, arr: Number(dec.total_arr) });
  }

  // Add the "hasta" month unless it's already the last milestone (Dec)
  const toPrefix = monthTo.slice(0, 7); // "YYYY-MM"
  const toPoint = findMonth(months, toPrefix);
  const lastMilestoneMonth = milestones[milestones.length - 1]?.month ?? "";
  if (toPoint && !lastMilestoneMonth.startsWith(toPrefix)) {
    milestones.push({
      label: formatMonth(toPoint.month),
      month: toPoint.month,
      arr: Number(toPoint.total_arr),
    });
  }

  if (milestones.length === 0) return null;

  const data = milestones.map((m, i) => {
    const prev = i > 0 ? milestones[i - 1].arr : null;
    const growthPct = prev != null && prev > 0 ? ((m.arr - prev) / prev) * 100 : null;
    const isLast = i === milestones.length - 1;
    return { ...m, growthPct, isLast };
  });

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Hitos anuales</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Comparativa ARR cierre de año</h2>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 28, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="label"
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
            formatter={(value) => [formatEUR(Number(value ?? 0)), "ARR"]}
            labelStyle={{ color: "#151229", fontWeight: 800 }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 18,
              border: "1px solid #e7e1f2",
              boxShadow: "0 18px 50px rgba(49,24,95,0.12)",
            }}
          />
          <Bar dataKey="arr" radius={[8, 8, 0, 0]} maxBarSize={80}>
            <LabelList
              dataKey="arr"
              position="top"
              formatter={(v: unknown) => formatCompactEUR(Number(v ?? 0))}
              style={{ fontSize: 11, fontWeight: 700, fill: "#2f185f" }}
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isLast ? "#6d35ff" : "#c4b0ff"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Growth % badges below each bar */}
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}
      >
        {data.map((d, i) => (
          <div key={d.label} className="flex justify-center">
            {i === 0 ? (
              <span className="rounded-full bg-[#f4f0fb] px-2 py-0.5 text-xs font-black text-[#837a9f]">
                base
              </span>
            ) : d.growthPct != null ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-black ${
                  d.growthPct >= 0 ? "bg-[#e9fbf7] text-[#0c8f76]" : "bg-[#fff0ef] text-[#d03932]"
                }`}
              >
                {d.growthPct >= 0 ? "+" : ""}
                {d.growthPct.toFixed(1)}%
              </span>
            ) : (
              <span className="rounded-full bg-[#f4f0fb] px-2 py-0.5 text-xs font-black text-[#837a9f]">-</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

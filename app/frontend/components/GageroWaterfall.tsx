"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BridgeResponse } from "@/lib/types";
import { formatCompactEUR, formatEUR } from "@/lib/utils";

const COLORS = {
  total: "#2f185f",
  new_logo: "#22c55e",
  churn: "#ef4444",
  up_selling: "#6d35ff",
  down_selling: "#f97316",
};

interface WaterfallPoint {
  name: string;
  base: number;
  value: number;
  color: string;
  tooltip: string;
  count?: number;
}

function buildWaterfallData(data: BridgeResponse, labelA: string, labelB: string): WaterfallPoint[] {
  const arrA = data.arr_a;
  const newLogo = data.new_logo.total_delta;
  const churnAbs = Math.abs(data.churn.total_delta);
  const upSelling = data.up_selling.total_delta;
  const downSellingAbs = Math.abs(data.down_selling.total_delta);

  const r1 = arrA + newLogo;
  const r2 = r1 - churnAbs;
  const r3 = r2 + upSelling;

  return [
    {
      name: labelA,
      base: 0,
      value: arrA,
      color: COLORS.total,
      tooltip: `ARR ${labelA}: ${formatEUR(arrA)}`,
    },
    {
      name: "New Logo",
      base: arrA,
      value: newLogo,
      color: COLORS.new_logo,
      tooltip: `New Logo: +${formatEUR(newLogo)}`,
      count: data.new_logo.count,
    },
    {
      name: "Churn",
      base: r2,
      value: churnAbs,
      color: COLORS.churn,
      tooltip: `Churn: -${formatEUR(churnAbs)}`,
      count: data.churn.count,
    },
    {
      name: "Up Selling",
      base: r2,
      value: upSelling,
      color: COLORS.up_selling,
      tooltip: `Up Selling: +${formatEUR(upSelling)}`,
      count: data.up_selling.count,
    },
    {
      name: "Down Selling",
      base: r3 - downSellingAbs,
      value: downSellingAbs,
      color: COLORS.down_selling,
      tooltip: `Down Selling: -${formatEUR(downSellingAbs)}`,
      count: data.down_selling.count,
    },
    {
      name: labelB,
      base: 0,
      value: data.arr_b,
      color: COLORS.total,
      tooltip: `ARR ${labelB}: ${formatEUR(data.arr_b)}`,
    },
  ];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WaterfallPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-[#e7e1f2] bg-white p-3 shadow-lg text-sm">
      <p className="font-bold text-[#2f185f]">{point.name}</p>
      <p className="text-[#6f6a80]">{point.tooltip}</p>
      {point.count !== undefined && (
        <p className="text-[#6f6a80]">{point.count} cuenta{point.count !== 1 ? "s" : ""}×BL</p>
      )}
    </div>
  );
}

interface Props {
  data: BridgeResponse;
  labelA: string;
  labelB: string;
}

export function GageroWaterfall({ data, labelA, labelB }: Props) {
  const points = buildWaterfallData(data, labelA, labelB);
  const maxVal = Math.max(data.arr_a, data.arr_b) * 1.08;

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Waterfall Bridge</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Variación de ARR</h2>
        <p className="mt-1 text-xs text-[#6f6a80]">Excluye Author Online (Stripe)</p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} barCategoryGap="28%">
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#6f6a80", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompactEUR}
            tick={{ fontSize: 11, fill: "#6f6a80" }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxVal]}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(109,53,255,0.06)" }} />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="value" stackId="w" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

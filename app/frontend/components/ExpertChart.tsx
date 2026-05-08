"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExpertResponseBlock } from "@/lib/types";
import { ACCOUNT_COLORS, PRODUCT_TYPE_COLORS } from "@/lib/constants";
import { formatCompactEUR, formatEUR } from "@/lib/utils";

type Props = Pick<
  ExpertResponseBlock,
  "chart_type" | "chart_title" | "chart_data" | "x_key" | "data_keys" | "colors"
>;

function resolveColor(key: string, index: number, customColors?: string[]): string {
  if (customColors?.[index]) return customColors[index];
  if (PRODUCT_TYPE_COLORS[key]) return PRODUCT_TYPE_COLORS[key];
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? "#6d35ff";
}

export function ExpertChart({ chart_type, chart_title, chart_data, x_key, data_keys, colors }: Props) {
  if (!chart_data || !x_key || !data_keys || data_keys.length === 0) return null;

  const commonAxisProps = {
    tick: { fontSize: 12, fill: "#837a9f", fontWeight: 600 },
    tickLine: false,
    axisLine: false,
  };

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 18,
    border: "1px solid #e7e1f2",
    boxShadow: "0 18px 50px rgba(49,24,95,0.12)",
  };

  const chartContent =
    chart_type === "bar" ? (
      <BarChart data={chart_data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
        <XAxis dataKey={x_key} {...commonAxisProps} />
        <YAxis
          tickFormatter={(v) => formatCompactEUR(v).replace("€", " EUR")}
          {...commonAxisProps}
          width={78}
        />
        <Tooltip
          formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
          labelStyle={{ color: "#151229", fontWeight: 800 }}
          contentStyle={tooltipStyle}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }} />
        {data_keys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={resolveColor(key, i, colors)} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    ) : (
      <LineChart data={chart_data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />
        <XAxis dataKey={x_key} {...commonAxisProps} />
        <YAxis
          tickFormatter={(v) => formatCompactEUR(v).replace("€", " EUR")}
          {...commonAxisProps}
          width={78}
        />
        <Tooltip
          formatter={(value, name) => [formatEUR(Number(value ?? 0)), String(name)]}
          labelStyle={{ color: "#151229", fontWeight: 800 }}
          contentStyle={tooltipStyle}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }} />
        {data_keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={resolveColor(key, i, colors)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7e1f2] bg-white p-4">
      {chart_title && (
        <p className="mb-3 text-sm font-black text-[#2f185f]">{chart_title}</p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        {chartContent}
      </ResponsiveContainer>
    </div>
  );
}

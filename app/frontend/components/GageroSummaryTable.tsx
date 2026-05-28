"use client";

import type { BridgeResponse } from "@/lib/types";
import { formatEUR } from "@/lib/utils";

interface Props {
  data: BridgeResponse;
}

type DriverKey = "new_logo" | "churn" | "up_selling" | "down_selling";

const DRIVERS: { key: DriverKey; label: string; color: string }[] = [
  { key: "new_logo", label: "New Logo", color: "#22c55e" },
  { key: "churn", label: "Churn", color: "#ef4444" },
  { key: "up_selling", label: "Up Selling", color: "#6d35ff" },
  { key: "down_selling", label: "Down Selling", color: "#f97316" },
];

function pct(value: number, base: number): string {
  if (!base) return "-";
  return `${value / base >= 0 ? "+" : ""}${((value / base) * 100).toFixed(1)}%`;
}

function DeltaCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <td className={`px-4 py-3 text-right font-bold ${positive ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
      {positive ? "+" : ""}
      {formatEUR(value)}
    </td>
  );
}

export function GageroSummaryTable({ data }: Props) {
  const rows = DRIVERS.map((driver) => ({
    label: driver.label,
    count: data[driver.key].count,
    delta: data[driver.key].total_delta,
    color: driver.color,
  }));

  const byBusinessLine = DRIVERS.flatMap((driver, driverIndex) => {
    const grouped = new Map<string, { count: number; delta: number }>();
    data[driver.key].items.forEach((item) => {
      const current = grouped.get(item.product_type) ?? { count: 0, delta: 0 };
      current.count += 1;
      current.delta += Number(item.delta);
      grouped.set(item.product_type, current);
    });
    return Array.from(grouped.entries()).map(([businessLine, values]) => ({
      businessLine,
      driver: driver.label,
      driverIndex,
      color: driver.color,
      ...values,
    }));
  }).sort((a, b) => a.businessLine.localeCompare(b.businessLine) || a.driverIndex - b.driverIndex);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="p-5 pb-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Resumen</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Tabla de drivers</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e7e1f2] bg-[#fbfaff]">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6f6a80]">Driver</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6f6a80]">N. cuentas x BL</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6f6a80]">ARR Total</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6f6a80]">% sobre ARR_A</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[#f4f0fb]">
                <td className="flex items-center gap-2 px-4 py-3 font-semibold text-[#2f185f]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </td>
                <td className="px-4 py-3 text-right text-[#6f6a80]">{row.count}</td>
                <DeltaCell value={row.delta} />
                <td className="px-4 py-3 text-right text-[#6f6a80]">{pct(row.delta, data.arr_a)}</td>
              </tr>
            ))}
            <tr className="bg-[#f7f3ff]">
              <td className="px-4 py-3 font-black text-[#2f185f]">Net change</td>
              <td className="px-4 py-3 text-right text-[#6f6a80]">-</td>
              <DeltaCell value={data.net_change} />
              <td className="px-4 py-3 text-right font-bold text-[#2f185f]">
                {data.net_change >= 0 ? "+" : ""}
                {(data.net_change_pct * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="p-5 pb-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Resumen por linea</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Drivers por linea de negocio</h2>
        </div>
        {byBusinessLine.length === 0 ? (
          <div className="px-5 pb-6 text-sm font-semibold text-[#837a9f]">
            No hay variaciones por linea de negocio para el periodo seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7e1f2] bg-[#fbfaff]">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6f6a80]">Linea de negocio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#6f6a80]">Driver</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6f6a80]">N. cuentas x BL</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6f6a80]">ARR Total</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#6f6a80]">% sobre ARR_A</th>
                </tr>
              </thead>
              <tbody>
                {byBusinessLine.map((row) => (
                  <tr key={`${row.businessLine}-${row.driver}`} className="border-b border-[#f4f0fb]">
                    <td className="px-4 py-3 font-semibold text-[#2f185f]">{row.businessLine}</td>
                    <td className="px-4 py-3 font-semibold text-[#2f185f]">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                        {row.driver}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#6f6a80]">{row.count}</td>
                    <DeltaCell value={row.delta} />
                    <td className="px-4 py-3 text-right text-[#6f6a80]">{pct(row.delta, data.arr_a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

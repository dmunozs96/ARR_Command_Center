"use client";

import type { BridgeItem, BridgeResponse } from "@/lib/types";
import { formatEUR } from "@/lib/utils";

type CategoryKey = "new_logo" | "churn" | "up_selling" | "down_selling";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  new_logo: "New Logo",
  churn: "Churn",
  up_selling: "Up Selling",
  down_selling: "Down Selling",
};

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  new_logo: "#22c55e",
  churn: "#ef4444",
  up_selling: "#6d35ff",
  down_selling: "#f97316",
};

interface Props {
  data: BridgeResponse;
  activeCategory: CategoryKey;
  onCategoryChange: (cat: CategoryKey) => void;
}

function DeltaCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <td className={`px-4 py-3 text-right font-bold ${positive ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
      {positive ? "+" : ""}{formatEUR(value)}
    </td>
  );
}

function ItemRow({ item }: { item: BridgeItem }) {
  return (
    <tr className="border-b border-[#f4f0fb] hover:bg-[#fbfaff] transition-colors">
      <td className="px-4 py-3 text-sm text-[#2f185f] font-medium">{item.account_name}</td>
      <td className="px-4 py-3 text-sm text-[#6f6a80]">{item.product_type}</td>
      <td className="px-4 py-3 text-right text-sm text-[#6f6a80]">
        {item.arr_a === 0 ? "—" : formatEUR(item.arr_a)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-[#6f6a80]">
        {item.arr_b === 0 ? "—" : formatEUR(item.arr_b)}
      </td>
      <DeltaCell value={item.delta} />
    </tr>
  );
}

export function GageroDetailTable({ data, activeCategory, onCategoryChange }: Props) {
  const categories: CategoryKey[] = ["new_logo", "churn", "up_selling", "down_selling"];
  const items = data[activeCategory].items;

  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white shadow-[0_18px_50px_rgba(49,24,95,0.06)] overflow-hidden">
      <div className="p-5 pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Detalle</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#151229]">Por cuenta × línea de negocio</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "text-white shadow-sm"
                    : "bg-[#f4f0fb] text-[#6d35ff] hover:bg-[#efe9ff]"
                }`}
                style={active ? { background: CATEGORY_COLORS[cat] } : {}}
              >
                {CATEGORY_LABELS[cat]}
                <span className="ml-1 opacity-75">({data[cat].count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 pb-6 text-sm text-[#6f6a80]">
          No hay registros en esta categoría para el periodo seleccionado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7e1f2] bg-[#fbfaff]">
                <th className="px-4 py-3 text-left font-bold text-[#6f6a80] uppercase tracking-wide text-xs">Cliente</th>
                <th className="px-4 py-3 text-left font-bold text-[#6f6a80] uppercase tracking-wide text-xs">Línea de Negocio</th>
                <th className="px-4 py-3 text-right font-bold text-[#6f6a80] uppercase tracking-wide text-xs">ARR Periodo A</th>
                <th className="px-4 py-3 text-right font-bold text-[#6f6a80] uppercase tracking-wide text-xs">ARR Periodo B</th>
                <th className="px-4 py-3 text-right font-bold text-[#6f6a80] uppercase tracking-wide text-xs">Delta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <ItemRow key={i} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

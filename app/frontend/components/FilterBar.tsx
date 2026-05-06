"use client";

import { CalendarRange, Layers3 } from "lucide-react";

interface Props {
  productType: string;
  onProductTypeChange: (v: string) => void;
  monthFrom: string;
  onMonthFromChange: (v: string) => void;
  monthTo: string;
  onMonthToChange: (v: string) => void;
}

const PRODUCT_TYPES = [
  "Todos",
  "SaaS LMS",
  "SaaS Skills",
  "SaaS Author",
  "SaaS Engage",
  "SaaS AIO",
  "Author Online",
  "TaaS",
  "Implantacion",
];

export function FilterBar({
  productType,
  onProductTypeChange,
  monthFrom,
  onMonthFromChange,
  monthTo,
  onMonthToChange,
}: Props) {
  return (
    <section className="rounded-3xl border border-[#e7e1f2] bg-white p-4 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
        <label className="group block">
          <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
            <Layers3 size={15} />
            Linea de negocio
          </span>
          <select
            value={productType}
            onChange={(e) => onProductTypeChange(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t === "Todos" ? "" : t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
            <CalendarRange size={15} />
            Desde
          </span>
          <input
            type="month"
            value={monthFrom.slice(0, 7)}
            onChange={(e) => onMonthFromChange(`${e.target.value}-01`)}
            className="h-12 w-full rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">
            <CalendarRange size={15} />
            Hasta
          </span>
          <input
            type="month"
            value={monthTo.slice(0, 7)}
            onChange={(e) => onMonthToChange(`${e.target.value}-01`)}
            className="h-12 w-full rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
          />
        </label>
      </div>
    </section>
  );
}

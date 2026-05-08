"use client";

import { CalendarRange, Layers3 } from "lucide-react";
import { useBLGrouping } from "@/lib/bl-grouping-context";

interface Props {
  productType: string;
  onProductTypeChange: (v: string) => void;
  monthFrom: string;
  onMonthFromChange: (v: string) => void;
  monthTo: string;
  onMonthToChange: (v: string) => void;
}

export function buildProductTypeOptions(combineLmsAio: boolean, combineAuthor: boolean) {
  const options: { label: string; value: string }[] = [{ label: "Todas", value: "" }];

  if (combineLmsAio) {
    options.push({ label: "LMS & AIO", value: "LMS & AIO" });
  } else {
    options.push({ label: "SaaS LMS", value: "SaaS LMS" });
    options.push({ label: "SaaS AIO", value: "SaaS AIO" });
  }

  options.push({ label: "SaaS Skills", value: "SaaS Skills" });
  options.push({ label: "SaaS Engage", value: "SaaS Engage" });

  if (combineAuthor) {
    options.push({ label: "Author (Total)", value: "Author (Total)" });
  } else {
    options.push({ label: "SaaS Author", value: "SaaS Author" });
    options.push({ label: "Author Online", value: "Author Online" });
  }

  options.push({ label: "TaaS", value: "TaaS" });
  options.push({ label: "Implantacion", value: "Implantacion" });

  return options;
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#151229]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d35ff] ${
          checked ? "bg-[#6d35ff]" : "bg-[#d8d0f0]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : ""
          }`}
        />
      </button>
      {label}
    </label>
  );
}

export function FilterBar({
  productType,
  onProductTypeChange,
  monthFrom,
  onMonthFromChange,
  monthTo,
  onMonthToChange,
}: Props) {
  const { combineLmsAio, setCombineLmsAio, combineAuthor, setCombineAuthor } = useBLGrouping();
  const options = buildProductTypeOptions(combineLmsAio, combineAuthor);

  // Reset product type filter if selected value no longer exists after toggle
  const currentValueExists = options.some((o) => o.value === productType);
  if (productType && !currentValueExists) {
    onProductTypeChange("");
  }

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
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#f0ebf8] pt-3">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]">Agrupaciones</span>
        <Toggle checked={combineLmsAio} onChange={setCombineLmsAio} label="Combinar LMS + AIO" />
        <Toggle checked={combineAuthor} onChange={setCombineAuthor} label="Combinar Author" />
      </div>
    </section>
  );
}

"use client";

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
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">
          Línea de negocio
        </label>
        <select
          value={productType}
          onChange={(e) => onProductTypeChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t === "Todos" ? "" : t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Desde</label>
        <input
          type="month"
          value={monthFrom.slice(0, 7)}
          onChange={(e) => onMonthFromChange(`${e.target.value}-01`)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Hasta</label>
        <input
          type="month"
          value={monthTo.slice(0, 7)}
          onChange={(e) => onMonthToChange(`${e.target.value}-01`)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
    </div>
  );
}

export const PRODUCT_TYPES = [
  "SaaS LMS",
  "SaaS AIO",
  "SaaS Author",
  "SaaS Engage",
  "SaaS Skills",
  "Author Online",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const BL_GROUP_LMS_AIO = ["SaaS LMS", "SaaS AIO"] as const;
export const BL_GROUP_AUTHOR = ["SaaS Author", "Author Online"] as const;

export const ACCOUNT_COLORS = [
  "#6d35ff", // isEazy primary purple
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple lighter
  "#eab308", // yellow
  "#22c55e", // green
  "#0ea5e9", // sky
  "#f43f5e", // rose
  "#64748b", // slate
  "#78716c", // stone
  "#6b7280", // gray
  "#9ca3af", // gray lighter
  // "Otros" usa siempre #e5e7eb
];

export const PRODUCT_TYPE_COLORS: Record<string, string> = {
  "SaaS LMS":       "#6d35ff",
  "SaaS AIO":       "#00a7d8",
  "LMS & AIO":      "#6d35ff",
  "SaaS Author":    "#ff5f57",
  "Author Online":  "#ffb020",
  "Author (Total)": "#ff5f57",
  "SaaS Engage":    "#c83cff",
  "SaaS Skills":    "#20c7a8",
  TaaS:             "#3557ff",
  Implantacion:     "#837a9f",
  Otro:             "#6f6a80",
};

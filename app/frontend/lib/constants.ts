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

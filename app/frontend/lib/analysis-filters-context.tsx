"use client";

import { createContext, useContext, useMemo, useState } from "react";

const DEFAULT_MONTH_FROM = "2021-01-01";
const DEFAULT_MONTH_TO = `${new Date().toISOString().slice(0, 7)}-01`;

type AnalysisFiltersContextValue = {
  productType: string;
  setProductType: (value: string) => void;
  accountName: string;
  setAccountName: (value: string) => void;
  monthFrom: string;
  setMonthFrom: (value: string) => void;
  monthTo: string;
  setMonthTo: (value: string) => void;
};

const AnalysisFiltersContext = createContext<AnalysisFiltersContextValue | undefined>(undefined);

export function AnalysisFiltersProvider({ children }: { children: React.ReactNode }) {
  const [productType, setProductType] = useState("");
  const [accountName, setAccountName] = useState("");
  const [monthFrom, setMonthFrom] = useState(DEFAULT_MONTH_FROM);
  const [monthTo, setMonthTo] = useState(DEFAULT_MONTH_TO);

  const value = useMemo(
    () => ({
      productType,
      setProductType,
      accountName,
      setAccountName,
      monthFrom,
      setMonthFrom,
      monthTo,
      setMonthTo,
    }),
    [accountName, monthFrom, monthTo, productType],
  );

  return <AnalysisFiltersContext.Provider value={value}>{children}</AnalysisFiltersContext.Provider>;
}

export function useAnalysisFilters() {
  const context = useContext(AnalysisFiltersContext);
  if (!context) {
    throw new Error("useAnalysisFilters must be used within AnalysisFiltersProvider");
  }
  return context;
}

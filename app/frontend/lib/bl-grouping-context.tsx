"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BLGroupingState {
  combineLmsAio: boolean;
  setCombineLmsAio: (v: boolean) => void;
  combineAuthor: boolean;
  setCombineAuthor: (v: boolean) => void;
}

const BLGroupingContext = createContext<BLGroupingState>({
  combineLmsAio: false,
  setCombineLmsAio: () => {},
  combineAuthor: false,
  setCombineAuthor: () => {},
});

export function BLGroupingProvider({ children }: { children: ReactNode }) {
  const [combineLmsAio, setCombineLmsAioState] = useState(false);
  const [combineAuthor, setCombineAuthorState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bl-grouping");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCombineLmsAioState(parsed.combineLmsAio ?? false);
        setCombineAuthorState(parsed.combineAuthor ?? false);
      }
    } catch {}
  }, []);

  const setCombineLmsAio = (v: boolean) => {
    setCombineLmsAioState(v);
    try {
      const current = JSON.parse(localStorage.getItem("bl-grouping") ?? "{}");
      localStorage.setItem("bl-grouping", JSON.stringify({ ...current, combineLmsAio: v }));
    } catch {}
  };

  const setCombineAuthor = (v: boolean) => {
    setCombineAuthorState(v);
    try {
      const current = JSON.parse(localStorage.getItem("bl-grouping") ?? "{}");
      localStorage.setItem("bl-grouping", JSON.stringify({ ...current, combineAuthor: v }));
    } catch {}
  };

  return (
    <BLGroupingContext.Provider value={{ combineLmsAio, setCombineLmsAio, combineAuthor, setCombineAuthor }}>
      {children}
    </BLGroupingContext.Provider>
  );
}

export const useBLGrouping = () => useContext(BLGroupingContext);

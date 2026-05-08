"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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

function readStoredGrouping(): { combineLmsAio: boolean; combineAuthor: boolean } {
  if (typeof window === "undefined") {
    return { combineLmsAio: false, combineAuthor: false };
  }
  try {
    const stored = localStorage.getItem("bl-grouping");
    if (!stored) return { combineLmsAio: false, combineAuthor: false };
    const parsed = JSON.parse(stored);
    return {
      combineLmsAio: parsed.combineLmsAio ?? false,
      combineAuthor: parsed.combineAuthor ?? false,
    };
  } catch {
    return { combineLmsAio: false, combineAuthor: false };
  }
}

export function BLGroupingProvider({ children }: { children: ReactNode }) {
  const [initialGrouping] = useState(readStoredGrouping);
  const [combineLmsAio, setCombineLmsAioState] = useState(initialGrouping.combineLmsAio);
  const [combineAuthor, setCombineAuthorState] = useState(initialGrouping.combineAuthor);

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

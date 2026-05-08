"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type ARRMode = "from_start" | "from_close";

interface ARRModeContextValue {
  arrMode: ARRMode;
  setArrMode: (mode: ARRMode) => void;
}

const ARRModeContext = createContext<ARRModeContextValue | undefined>(undefined);
const STORAGE_KEY = "arr-command-center-mode";

export function ARRModeProvider({ children }: { children: React.ReactNode }) {
  const [arrMode, setArrModeState] = useState<ARRMode>(() => {
    if (typeof window === "undefined") return "from_start";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "from_start" || stored === "from_close" ? stored : "from_start";
  });

  const value = useMemo(
    () => ({
      arrMode,
      setArrMode: (mode: ARRMode) => {
        setArrModeState(mode);
        window.localStorage.setItem(STORAGE_KEY, mode);
      },
    }),
    [arrMode],
  );

  return <ARRModeContext.Provider value={value}>{children}</ARRModeContext.Provider>;
}

export function useARRMode() {
  const context = useContext(ARRModeContext);
  if (!context) {
    throw new Error("useARRMode must be used within ARRModeProvider");
  }
  return context;
}

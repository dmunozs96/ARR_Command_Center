"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SnapshotSummary } from "@/lib/types";

const STORAGE_KEY = "arr-active-snapshot-id";

type SnapshotContextValue = {
  snapshots: SnapshotSummary[];
  latestSnapshot: SnapshotSummary | null;
  activeSnapshot: SnapshotSummary | null;
  activeSnapshotId: string | null;
  setActiveSnapshotId: (snapshotId: string) => void;
  isLoading: boolean;
};

const SnapshotContext = createContext<SnapshotContextValue | null>(null);

function readStoredSnapshotId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [activeSnapshotId, setActiveSnapshotIdState] = useState<string | null>(
    readStoredSnapshotId,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });

  const snapshots = useMemo(() => data ?? [], [data]);
  const latestSnapshot = snapshots[0] ?? null;

  const activeSnapshot = useMemo(() => {
    if (!activeSnapshotId) {
      return latestSnapshot;
    }
    return snapshots.find((snapshot) => snapshot.id === activeSnapshotId) ?? latestSnapshot;
  }, [activeSnapshotId, latestSnapshot, snapshots]);

  const value = useMemo<SnapshotContextValue>(
    () => ({
      snapshots,
      latestSnapshot,
      activeSnapshot,
      activeSnapshotId: activeSnapshot?.id ?? null,
      setActiveSnapshotId: (snapshotId: string) => {
        setActiveSnapshotIdState(snapshotId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, snapshotId);
        }
      },
      isLoading,
    }),
    [activeSnapshot, isLoading, latestSnapshot, snapshots]
  );

  return <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>;
}

export function useSnapshotContext() {
  const context = useContext(SnapshotContext);
  if (!context) {
    throw new Error("useSnapshotContext must be used within SnapshotProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
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

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [activeSnapshotId, setActiveSnapshotIdState] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });

  const snapshots = data ?? [];
  const latestSnapshot = snapshots[0] ?? null;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveSnapshotIdState(stored);
      }
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated || snapshots.length === 0) {
      return;
    }

    const hasCurrentSelection = activeSnapshotId
      ? snapshots.some((snapshot) => snapshot.id === activeSnapshotId)
      : false;

    if (!hasCurrentSelection) {
      const fallbackId = latestSnapshot?.id ?? null;
      setActiveSnapshotIdState(fallbackId);
      if (fallbackId) {
        window.localStorage.setItem(STORAGE_KEY, fallbackId);
      }
    }
  }, [activeSnapshotId, hasHydrated, latestSnapshot?.id, snapshots]);

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
        window.localStorage.setItem(STORAGE_KEY, snapshotId);
      },
      isLoading: isLoading || !hasHydrated,
    }),
    [activeSnapshot, hasHydrated, isLoading, latestSnapshot, snapshots]
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

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SnapshotProvider } from "@/lib/snapshot-context";
import { BLGroupingProvider } from "@/lib/bl-grouping-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SnapshotProvider>
        <BLGroupingProvider>{children}</BLGroupingProvider>
      </SnapshotProvider>
    </QueryClientProvider>
  );
}

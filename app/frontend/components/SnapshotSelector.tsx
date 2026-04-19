"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { formatSnapshotLabel, snapshotStatusLabel } from "@/lib/utils";

type SnapshotSelectorProps = {
  className?: string;
};

function SnapshotSelectorContent({ className }: SnapshotSelectorProps) {
  const { snapshots, activeSnapshotId, setActiveSnapshotId, isLoading } = useSnapshotContext();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedValue = activeSnapshotId ?? "";

  const snapshotHelp = useMemo(() => {
    const active = snapshots.find((snapshot) => snapshot.id === activeSnapshotId);
    if (!active) {
      return "Sin snapshot seleccionado";
    }
    return snapshotStatusLabel(active.status);
  }, [activeSnapshotId, snapshots]);

  function handleChange(snapshotId: string) {
    setActiveSnapshotId(snapshotId);

    if (pathname !== "/snapshots") {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("active", snapshotId);
    router.replace(`/snapshots?${nextParams.toString()}`);
  }

  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        Snapshot activo
      </label>
      <select
        value={selectedValue}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isLoading || snapshots.length === 0}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        {snapshots.length === 0 && <option value="">Sin snapshots</option>}
        {snapshots.map((snapshot) => (
          <option key={snapshot.id} value={snapshot.id}>
            {formatSnapshotLabel(snapshot.created_at)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">{snapshotHelp}</p>
    </div>
  );
}

export function SnapshotSelector({ className }: SnapshotSelectorProps) {
  return (
    <Suspense fallback={<div className={className} />}>
      <SnapshotSelectorContent className={className} />
    </Suspense>
  );
}

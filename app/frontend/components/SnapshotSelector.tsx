"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
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
      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#837a9f]">
        Snapshot activo
      </label>
      <div className="rounded-2xl border border-[#e7e1f2] bg-white p-3 shadow-sm">
        <select
          value={selectedValue}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isLoading || snapshots.length === 0}
          className="w-full rounded-xl border border-[#e7e1f2] bg-[#fbfaff] px-3 py-2 text-sm font-semibold text-[#151229] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10 disabled:cursor-not-allowed disabled:bg-[#f3f0f8]"
        >
          {snapshots.length === 0 && <option value="">Sin snapshots</option>}
          {snapshots.map((snapshot) => (
            <option key={snapshot.id} value={snapshot.id}>
              {formatSnapshotLabel(snapshot.created_at)}
            </option>
          ))}
        </select>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#6f6a80]">
          <CheckCircle2 size={14} className="text-[#20c7a8]" />
          {snapshotHelp}
        </p>
      </div>
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

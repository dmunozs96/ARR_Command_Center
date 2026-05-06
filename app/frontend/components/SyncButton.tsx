"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { getSyncErrorMessage } from "@/lib/api-errors";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const qc = useQueryClient();

  async function handleSync() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.triggerSync({ triggered_by: "UI" });
      await qc.invalidateQueries();
      setSuccess(
        response.records_processed != null
          ? `Sync completada: ${response.records_processed} registros procesados.`
          : "Sync completada correctamente.",
      );
    } catch (error) {
      setError(getSyncErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {(error || success) && (
        <div
          className={`absolute right-0 top-12 z-20 w-72 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-lg ${
            error ? "border-[#ffd0cd] bg-[#fff0ef] text-[#b82f2a]" : "border-[#bfefe4] bg-[#e9fbf7] text-[#0c7564]"
          }`}
        >
          {error ?? success}
        </div>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#6d35ff] px-4 text-sm font-black text-white shadow-lg shadow-[#6d35ff]/20 transition hover:bg-[#5b27e6] disabled:opacity-60"
      >
        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        Actualizar SF
      </button>
    </div>
  );
}

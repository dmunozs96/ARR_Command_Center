"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
    <div className="flex flex-col items-end gap-2">
      {error && (
        <div className="max-w-xs rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-right text-xs text-red-700 shadow-sm">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="max-w-xs rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right text-xs text-emerald-700 shadow-sm">
          {success}
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Sincronizando...
          </>
        ) : (
          <>Actualizar SF</>
        )}
      </button>
    </div>
  );
}

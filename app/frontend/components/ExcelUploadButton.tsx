"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";

export function ExcelUploadButton() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const qc = useQueryClient();

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.importExcel(file);
      await qc.invalidateQueries();
      setSuccess(
        response.records_processed != null
          ? `Excel importado: ${response.records_processed} registros procesados.`
          : "Excel importado correctamente.",
      );
    } catch (uploadError) {
      setError(getAPIErrorMessage(uploadError, "No se pudo importar el Excel."));
    } finally {
      setLoading(false);
      event.target.value = "";
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

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileSelected}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-500 border-t-transparent" />
            Importando...
          </>
        ) : (
          <>Subir Excel</>
        )}
      </button>
      <p className="max-w-xs text-right text-[11px] text-stone-500">
        Fallback manual para recalcular snapshots mientras Salesforce no este conectado.
      </p>
    </div>
  );
}

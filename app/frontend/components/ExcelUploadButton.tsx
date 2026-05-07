"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
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
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    let response;
    try {
      response = await api.importExcel(file);
    } catch (uploadError) {
      setError(getAPIErrorMessage(uploadError, "No se pudo importar el Excel."));
      setLoading(false);
      event.target.value = "";
      return;
    }

    try {
      await qc.invalidateQueries();
      setSuccess(
        response.records_processed != null
          ? `Excel importado: ${response.records_processed} registros procesados.`
          : "Excel importado correctamente.",
      );
    } catch {
      setSuccess(
        response.records_processed != null
          ? `Excel importado: ${response.records_processed} registros procesados. Actualiza la pagina si alguna vista no se refresca.`
          : "Excel importado correctamente. Actualiza la pagina si alguna vista no se refresca.",
      );
    } finally {
      setLoading(false);
      event.target.value = "";
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
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileSelected} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e7e1f2] bg-white px-4 text-sm font-black text-[#2f185f] shadow-sm transition hover:border-[#6d35ff] hover:bg-[#fbfaff] disabled:opacity-60"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#6d35ff] border-t-transparent" />
        ) : (
          <UploadCloud size={18} />
        )}
        Subir Excel
      </button>
    </div>
  );
}

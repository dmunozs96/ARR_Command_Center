"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";
import { useSnapshotContext } from "@/lib/snapshot-context";
import { currentMonthStart, formatDateTime, formatEUR } from "@/lib/utils";
import type { StripeMRROut } from "@/lib/types";

function formatMonthLabel(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("es-ES", {
    month: "short",
    year: "numeric",
  });
}

function MRRModal({
  row,
  snapshotId,
  onClose,
}: {
  row: StripeMRROut | { month: string; mrr: null };
  snapshotId: string;
  onClose: () => void;
}) {
  const [mrr, setMrr] = useState(row.mrr != null ? String(row.mrr) : "");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.upsertStripeMRR({
        snapshot_id: snapshotId,
        month: row.month,
        mrr: Number(mrr),
        entered_by: "UI",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe-mrr"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-semibold text-gray-900">ARR Stripe - {formatMonthLabel(row.month)}</h3>
        <div>
          <label className="mb-1 block text-xs text-gray-500">ARR (EUR)</label>
          <input
            type="number"
            value={mrr}
            onChange={(event) => setMrr(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Ej: 114000"
            autoFocus
          />
        </div>
        {mutation.isError && (
          <p className="text-xs text-red-500">
            {getAPIErrorMessage(mutation.error, "Error al guardar. Intenta de nuevo.")}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!mrr || mutation.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    ["Mes (YYYY-MM-DD)", "ARR (EUR)"],
    ["2024-01-01", 114000],
    ["2024-02-01", 122400],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 20 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "MRR Stripe");
  XLSX.writeFile(wb, "plantilla_mrr_stripe.xlsx");
}

function parseExcelRows(file: File): Promise<{ month: string; mrr: number }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        const parsed: { month: string; mrr: number }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;
          const rawMonth = row[0];
          const rawMrr = row[1];
          if (rawMonth == null || rawMrr == null || String(rawMonth).trim() === "") continue;
          let monthStr = String(rawMonth).trim();
          // Accept Excel serial numbers (date stored as number)
          if (typeof rawMonth === "number") {
            const d = XLSX.SSF.parse_date_code(rawMonth);
            monthStr = `${d.y}-${String(d.m).padStart(2, "0")}-01`;
          }
          // Normalise: keep only YYYY-MM part and force day=01
          const match = monthStr.match(/^(\d{4})-(\d{2})/);
          if (!match) continue;
          const month = `${match[1]}-${match[2]}-01`;
          const mrr = Number(rawMrr);
          if (isNaN(mrr) || mrr < 0) continue;
          parsed.push({ month, mrr });
        }
        resolve(parsed);
      } catch {
        reject(new Error("No se pudo leer el archivo. Asegúrate de que es un Excel válido."));
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

function BulkUploadModal({
  rows,
  snapshotId,
  onClose,
}: {
  rows: { month: string; mrr: number }[];
  snapshotId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api.bulkUpsertStripeMRR({ snapshot_id: snapshotId, rows, entered_by: "UI_bulk" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe-mrr"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-semibold text-gray-900">Subida masiva — {rows.length} fila{rows.length !== 1 ? "s" : ""} detectada{rows.length !== 1 ? "s" : ""}</h3>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 text-left">Mes</th>
                <th className="px-4 py-2 text-right">ARR (EUR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.month}>
                  <td className="px-4 py-1.5 text-gray-700">{formatMonthLabel(r.month)}</td>
                  <td className="px-4 py-1.5 text-right text-gray-900">{formatEUR(r.mrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mutation.isError && (
          <p className="text-xs text-red-500">
            {getAPIErrorMessage(mutation.error, "Error al guardar. Intenta de nuevo.")}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="text-xs text-green-600">Datos importados correctamente.</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || rows.length === 0}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Importando..." : `Importar ${rows.length} fila${rows.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StripePage() {
  const [editRow, setEditRow] = useState<StripeMRROut | null>(null);
  const [addMonth, setAddMonth] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<{ month: string; mrr: number }[] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeSnapshot, isLoading: snapshotsLoading } = useSnapshotContext();
  const currentMonth = currentMonthStart();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBulkError(null);
    try {
      const rows = await parseExcelRows(file);
      if (rows.length === 0) {
        setBulkError("No se encontraron filas válidas en el Excel. Revisa el formato.");
        return;
      }
      setBulkRows(rows);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Error al leer el archivo.");
    }
  }

  const stripeQuery = useQuery({
    queryKey: ["stripe-mrr", activeSnapshot?.id],
    queryFn: () => api.getStripeMRR({ snapshot_id: activeSnapshot?.id }),
    enabled: !!activeSnapshot,
  });

  const rows = stripeQuery.data ?? [];
  const currentMonthRow = rows.find((row) => row.month === currentMonth);
  const isCurrentMonthMissing = !!activeSnapshot && !stripeQuery.isLoading && !currentMonthRow;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6" data-testid="stripe-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">isEazy Author Online - ARR de Stripe</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Input manual - snapshot activo:{" "}
            {activeSnapshot ? formatDateTime(activeSnapshot.created_at) : "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Descargar plantilla
          </button>
          <button
            onClick={() => { setBulkError(null); fileInputRef.current?.click(); }}
            disabled={!activeSnapshot}
            className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Subir Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => {
              const now = new Date();
              const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
              setAddMonth(month);
            }}
            disabled={!activeSnapshot}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Anadir mes
          </button>
        </div>
      </div>

      {snapshotsLoading && (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-500 shadow-sm">
          Cargando snapshots...
        </div>
      )}

      {!snapshotsLoading && !activeSnapshot && (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">Todavia no hay snapshot activo</p>
          <p className="mt-1 text-sm text-stone-600">
            Crea un snapshot antes de introducir el MRR manual de Stripe.
          </p>
        </div>
      )}

      {stripeQuery.isError && (
        <div
          data-testid="stripe-error"
          className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-red-900">No se pudo cargar Stripe MRR</p>
          <p className="mt-1 text-sm text-red-800">
            {getAPIErrorMessage(stripeQuery.error, "Error al cargar los datos de Stripe.")}
          </p>
        </div>
      )}

      {isCurrentMonthMissing && (
        <div
          data-testid="stripe-current-month-warning"
          className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Falta el ARR de Stripe del mes actual
              </p>
              <p className="mt-1 text-sm text-amber-800">
                No hay dato cargado para {formatMonthLabel(currentMonth)} en el snapshot activo.
              </p>
            </div>
            <button
              onClick={() => setAddMonth(currentMonth)}
              className="rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-950"
            >
              Cargar este mes
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" data-testid="stripe-table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-2.5 text-left">Mes</th>
                <th className="px-4 py-2.5 text-right">ARR (EUR)</th>
                <th className="px-4 py-2.5 text-right">Actualizado</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stripeQuery.isLoading &&
                [0, 1, 2].map((row) => (
                  <tr key={row} className="animate-pulse">
                    <td colSpan={4} className="px-5 py-3">
                      <div className="h-4 rounded bg-gray-100" />
                    </td>
                  </tr>
                ))}

              {!stripeQuery.isLoading && rows.length === 0 && !stripeQuery.isError && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    Sin datos de Stripe aun. Anade el primer mes.
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-800">{formatMonthLabel(row.month)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatEUR(row.mrr)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                    {row.entered_at ? new Date(row.entered_at).toLocaleDateString("es-ES") : "-"}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => setEditRow(row)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bulkError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {bulkError}
        </div>
      )}

      {editRow && activeSnapshot && (
        <MRRModal row={editRow} snapshotId={activeSnapshot.id} onClose={() => setEditRow(null)} />
      )}
      {addMonth && activeSnapshot && (
        <MRRModal
          row={{ month: addMonth, mrr: null }}
          snapshotId={activeSnapshot.id}
          onClose={() => setAddMonth(null)}
        />
      )}
      {bulkRows && activeSnapshot && (
        <BulkUploadModal
          rows={bulkRows}
          snapshotId={activeSnapshot.id}
          onClose={() => setBulkRows(null)}
        />
      )}
    </div>
  );
}

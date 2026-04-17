"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEUR } from "@/lib/utils";
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
        <h3 className="font-semibold text-gray-900">
          MRR Stripe — {formatMonthLabel(row.month)}
        </h3>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">MRR (€)</label>
          <input
            type="number"
            value={mrr}
            onChange={(e) => setMrr(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Ej: 9500"
            autoFocus
          />
        </div>
        {mutation.isError && (
          <p className="text-xs text-red-500">Error al guardar. Intenta de nuevo.</p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!mrr || mutation.isPending}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StripePage() {
  const [editRow, setEditRow] = useState<StripeMRROut | null>(null);
  const [addMonth, setAddMonth] = useState<string | null>(null);

  const { data: snapshots } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });
  const latestSnapshot = snapshots?.[0];

  const { data: mrrData, isLoading } = useQuery({
    queryKey: ["stripe-mrr", latestSnapshot?.id],
    queryFn: () => api.getStripeMRR({ snapshot_id: latestSnapshot?.id }),
    enabled: !!latestSnapshot,
  });

  const rows = mrrData ?? [];

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            isEazy Author Online — MRR de Stripe
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Input manual — actualizar mensualmente desde Stripe
          </p>
        </div>
        <button
          onClick={() => {
            const now = new Date();
            const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
            setAddMonth(m);
          }}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + Añadir mes
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">Mes</th>
                <th className="text-right px-4 py-2.5">MRR (€)</th>
                <th className="text-right px-4 py-2.5">ARR Equiv.</th>
                <th className="text-right px-4 py-2.5">Actualizado</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                [0, 1, 2].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-5 py-3">
                      <div className="h-4 bg-gray-100 rounded" />
                    </td>
                  </tr>
                ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    Sin datos de Stripe aún. Añade el primer mes.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-800">
                    {formatMonthLabel(row.month)}
                  </td>
                  <td className="text-right px-4 py-2.5 text-gray-900">
                    {formatEUR(row.mrr)}
                  </td>
                  <td className="text-right px-4 py-2.5 text-gray-700">
                    {formatEUR(row.arr_equivalent)}
                  </td>
                  <td className="text-right px-4 py-2.5 text-gray-400 text-xs">
                    {row.entered_at
                      ? new Date(row.entered_at).toLocaleDateString("es-ES")
                      : "—"}
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

      {editRow && latestSnapshot && (
        <MRRModal
          row={editRow}
          snapshotId={latestSnapshot.id}
          onClose={() => setEditRow(null)}
        />
      )}
      {addMonth && latestSnapshot && (
        <MRRModal
          row={{ month: addMonth, mrr: null }}
          snapshotId={latestSnapshot.id}
          onClose={() => setAddMonth(null)}
        />
      )}
    </div>
  );
}

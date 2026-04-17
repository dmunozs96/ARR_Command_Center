"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const SEVERITY_COLOR: Record<string, string> = {
  ERROR: "bg-red-50 border-red-200 text-red-700",
  WARNING: "bg-amber-50 border-amber-200 text-amber-700",
  INFO: "bg-blue-50 border-blue-200 text-blue-700",
};

const SEVERITY_ICON: Record<string, string> = {
  ERROR: "🔴",
  WARNING: "⚠️",
  INFO: "ℹ️",
};

export default function AlertsPage() {
  const [showReviewed, setShowReviewed] = useState(false);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: snapshots } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });
  const latestSnapshot = snapshots?.[0];

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts", latestSnapshot?.id, showReviewed],
    queryFn: () =>
      api.getAlerts({
        snapshot_id: latestSnapshot?.id,
        reviewed: showReviewed ? undefined : false,
      }),
    enabled: !!latestSnapshot,
  });

  const mutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.patchAlert(id, { reviewed: true, review_note: note, reviewed_by: "CFO" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-unreviewed"] });
    },
  });

  const grouped = (alerts ?? []).reduce<Record<string, typeof alerts>>(
    (acc, a) => {
      if (!acc[a.alert_type]) acc[a.alert_type] = [];
      acc[a.alert_type]!.push(a);
      return acc;
    },
    {}
  );

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Alertas de calidad de datos
        </h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(e) => setShowReviewed(e.target.checked)}
            className="rounded"
          />
          Mostrar revisadas
        </label>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && Object.keys(grouped).length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700">
          ✅ No hay alertas pendientes de revisión.
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {type} ({items?.length})
          </h2>
          {items?.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 space-y-2 ${
                alert.reviewed
                  ? "bg-gray-50 border-gray-200 opacity-60"
                  : SEVERITY_COLOR[alert.severity] ?? "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {SEVERITY_ICON[alert.severity] ?? "•"} {alert.opportunity_name ?? "—"}
                  </p>
                  {alert.account_name && (
                    <p className="text-xs text-gray-500">
                      Cliente: {alert.account_name}
                      {alert.product_name ? ` | Producto: ${alert.product_name}` : ""}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">{alert.description}</p>
                </div>
                {!alert.reviewed && (
                  <span className="text-xs bg-white/80 border border-current rounded px-1.5 py-0.5 whitespace-nowrap">
                    {alert.severity}
                  </span>
                )}
              </div>

              {alert.reviewed ? (
                <p className="text-xs text-gray-500">
                  ✓ Revisada{alert.review_note ? `: "${alert.review_note}"` : ""}
                </p>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Nota opcional…"
                    value={noteInput[alert.id] ?? ""}
                    onChange={(e) =>
                      setNoteInput((prev) => ({ ...prev, [alert.id]: e.target.value }))
                    }
                    className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    onClick={() =>
                      mutation.mutate({ id: alert.id, note: noteInput[alert.id] ?? "" })
                    }
                    disabled={mutation.isPending}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
                  >
                    Marcar revisada
                  </button>
                  {alert.alert_type === "UNCLASSIFIED_PRODUCT" && (
                    <a
                      href="/config"
                      className="text-xs px-3 py-1.5 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 whitespace-nowrap"
                    >
                      Ir a config
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

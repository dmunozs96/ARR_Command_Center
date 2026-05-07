"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAPIErrorMessage } from "@/lib/api-errors";
import { useSnapshotContext } from "@/lib/snapshot-context";
import type { AlertOut } from "@/lib/types";
import { formatDateTime, formatEUR } from "@/lib/utils";

type ExclusionState = Record<string, boolean | undefined>; // arr_line_item_id → excluded

const SEVERITY_COLOR: Record<string, string> = {
  ERROR: "border-red-200 bg-red-50 text-red-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  INFO: "border-sky-200 bg-sky-50 text-sky-700",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  UNCLASSIFIED_PRODUCT: "Producto sin clasificar",
  MISSING_START_DATE: "Fecha de inicio ausente",
  MISSING_END_DATE: "Fecha de fin ausente",
  LONG_SERVICE_PERIOD: "Duracion anomala",
  OVERLAPPING_CONTRACTS: "Solapamiento de contratos",
};

const PRODUCT_TYPES = [
  "SaaS LMS",
  "SaaS Skills",
  "SaaS Author",
  "SaaS Engage",
  "SaaS AIO",
  "TaaS",
  "Implantacion",
  "Otro",
];

function severityLabel(severity: string): string {
  const labels: Record<string, string> = { ERROR: "Error", WARNING: "Warning", INFO: "Info" };
  return labels[severity.toUpperCase()] ?? severity;
}

function alertTypeLabel(alertType: string): string {
  return ALERT_TYPE_LABELS[alertType] ?? alertType.replaceAll("_", " ");
}

function AlertCard({
  alert,
  expanded,
  note,
  onToggle,
  onNoteChange,
  onMarkReviewed,
  isMutating,
  isExcluded,
  onToggleExclusion,
  isExclusionMutating,
  onApplyFix,
  isFixMutating,
}: {
  alert: AlertOut;
  expanded: boolean;
  note: string;
  onToggle: () => void;
  onNoteChange: (value: string) => void;
  onMarkReviewed: () => void;
  isMutating: boolean;
  isExcluded?: boolean;
  onToggleExclusion?: () => void;
  isExclusionMutating?: boolean;
  onApplyFix?: (productType: string) => void;
  isFixMutating?: boolean;
}) {
  const severity = alert.severity.toUpperCase();
  const [selectedType, setSelectedType] = useState("");

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm transition ${
        alert.reviewed
          ? "border-stone-200 bg-stone-50"
          : SEVERITY_COLOR[severity] ?? "border-stone-200 bg-white text-stone-700"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
              {severityLabel(severity)}
            </span>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
              {alertTypeLabel(alert.alert_type)}
            </span>
            {alert.reviewed && (
              <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-700">
                Revisada
              </span>
            )}
            {alert.arr_impact != null && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                Impacto ARR: {formatEUR(alert.arr_impact)}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              {alert.opportunity_name ?? "Oportunidad sin nombre"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">{alert.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-stone-500">
            {alert.account_name && (
              <span className="rounded-full bg-white/80 px-2.5 py-1">Cliente: {alert.account_name}</span>
            )}
            {alert.product_name && (
              <span className="rounded-full bg-white/80 px-2.5 py-1">Producto: {alert.product_name}</span>
            )}
            {alert.created_at && (
              <span className="rounded-full bg-white/80 px-2.5 py-1">Detectada: {formatDateTime(alert.created_at)}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggle}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            {expanded ? "Ocultar detalle" : "Ver detalle"}
          </button>
          {alert.alert_type === "UNCLASSIFIED_PRODUCT" && alert.product_name && (
            <Link
              href={`/config?product=${encodeURIComponent(alert.product_name)}&fromAlert=${alert.id}`}
              className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 transition hover:bg-amber-50"
            >
              Ir a config
            </Link>
          )}
          {alert.alert_type === "OVERLAPPING_CONTRACTS" && alert.arr_line_item_id && onToggleExclusion && (
            <button
              onClick={onToggleExclusion}
              disabled={isExclusionMutating}
              className={`rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isExcluded
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
              }`}
            >
              {isExcluded ? "Incluir en ARR" : "Excluir del ARR"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-5 grid gap-5 rounded-2xl border border-white/70 bg-white/80 p-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Detalle</p>
              <div className="mt-2 space-y-2 text-sm text-stone-600">
                <p>
                  <span className="font-medium text-stone-800">Alert ID:</span> {alert.id}
                </p>
                {alert.sf_opportunity_id && (
                  <p>
                    <span className="font-medium text-stone-800">SF Opportunity:</span>{" "}
                    {alert.sf_opportunity_id}
                  </p>
                )}
                {alert.reviewed_at && (
                  <p>
                    <span className="font-medium text-stone-800">Revisada:</span>{" "}
                    {formatDateTime(alert.reviewed_at)}
                    {alert.reviewed_by ? ` por ${alert.reviewed_by}` : ""}
                  </p>
                )}
                {alert.review_note && (
                  <p>
                    <span className="font-medium text-stone-800">Nota actual:</span>{" "}
                    {alert.review_note}
                  </p>
                )}
              </div>
            </div>

            {/* Inline fix for UNCLASSIFIED_PRODUCT */}
            {alert.alert_type === "UNCLASSIFIED_PRODUCT" && alert.product_name && !alert.reviewed && onApplyFix && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-900">Corregir y guardar en maestros</p>
                {alert.arr_impact != null && (
                  <p className="text-sm text-amber-800">
                    ARR en riesgo: <span className="font-black">{formatEUR(alert.arr_impact)}</span>
                  </p>
                )}
                <p className="text-xs text-amber-700">
                  Asigna un tipo al producto <span className="font-semibold">{alert.product_name}</span>.
                  Se guardara en maestros para futuros imports.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  >
                    <option value="">Selecciona tipo de producto...</option>
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => selectedType && onApplyFix(selectedType)}
                    disabled={!selectedType || isFixMutating}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFixMutating ? "Guardando..." : "Guardar en maestros"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Nota de revision</p>
            <textarea
              rows={5}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Documenta aqui la decision tomada o el siguiente paso..."
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-stone-500">
                La nota se guarda junto con la alerta al marcarla como revisada.
              </p>
              {!alert.reviewed && (
                <button
                  onClick={onMarkReviewed}
                  disabled={isMutating}
                  className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  Marcar revisada
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function AlertsPageContent() {
  const searchParams = useSearchParams();
  const initialAlertId = searchParams.get("alertId") ?? "";
  const qc = useQueryClient();
  const { activeSnapshot } = useSnapshotContext();

  const [showReviewed, setShowReviewed] = useState(false);
  const [alertType, setAlertType] = useState("ALL");
  const [expandedAlertId, setExpandedAlertId] = useState(initialAlertId);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [exclusionState, setExclusionState] = useState<ExclusionState>({});

  const { data: alerts, isLoading, isError, error } = useQuery({
    queryKey: ["alerts", activeSnapshot?.id, showReviewed, alertType],
    queryFn: () =>
      api.getAlerts({
        snapshot_id: activeSnapshot?.id,
        reviewed: showReviewed ? undefined : false,
        alert_type: alertType === "ALL" ? undefined : alertType,
      }),
    enabled: !!activeSnapshot,
  });

  const productsQuery = useQuery({
    queryKey: ["config-products"],
    queryFn: () => api.getProducts(),
    enabled: !!activeSnapshot,
  });

  const mutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.patchAlert(id, { reviewed: true, review_note: note, reviewed_by: "CFO" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-unreviewed"] });
    },
  });

  const exclusionMutation = useMutation({
    mutationFn: ({ lineItemId, excluded }: { lineItemId: string; excluded: boolean }) =>
      api.patchLineItemExclusion(lineItemId, excluded),
    onSuccess: (_, { lineItemId, excluded }) => {
      setExclusionState((prev) => ({ ...prev, [lineItemId]: excluded }));
      qc.invalidateQueries({ queryKey: ["arr-summary"] });
    },
  });

  const fixMutation = useMutation({
    mutationFn: async ({ alert, productType }: { alert: AlertOut; productType: string }) => {
      const productName = alert.product_name!;
      const existing = (productsQuery.data ?? []).find(
        (p) => p.product_name.toLowerCase() === productName.toLowerCase(),
      );
      if (existing) {
        await api.updateProduct(existing.id, { product_type: productType });
      } else {
        await api.createProduct({ product_name: productName, product_type: productType });
      }
      await api.patchAlert(alert.id, {
        reviewed: true,
        review_note: `Clasificado como "${productType}" y guardado en maestros.`,
        reviewed_by: "CFO",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-unreviewed"] });
      qc.invalidateQueries({ queryKey: ["config-products"] });
      qc.invalidateQueries({ queryKey: ["arr-summary"] });
    },
  });

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set((alerts ?? []).map((alert) => alert.alert_type)));
    return types.sort((a, b) => a.localeCompare(b));
  }, [alerts]);

  const stats = useMemo(() => {
    const items = alerts ?? [];
    const totalImpact = items.reduce((sum, a) => sum + (a.arr_impact ?? 0), 0);
    return {
      total: items.length,
      reviewed: items.filter((a) => a.reviewed).length,
      errors: items.filter((a) => a.severity.toUpperCase() === "ERROR").length,
      unclassified: items.filter((a) => a.alert_type === "UNCLASSIFIED_PRODUCT").length,
      totalImpact,
    };
  }, [alerts]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" data-testid="alerts-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Alertas de calidad de datos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Snapshot activo: {activeSnapshot ? formatDateTime(activeSnapshot.created_at) : "-"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tipo</span>
            <select
              value={alertType}
              onChange={(event) => setAlertType(event.target.value)}
              className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
            >
              <option value="ALL">Todos los tipos</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>{alertTypeLabel(type)}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={showReviewed}
              onChange={(event) => setShowReviewed(event.target.checked)}
              className="rounded"
            />
            Mostrar revisadas
          </label>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total alertas</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{stats.total}</p>
        </div>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Errores</p>
          <p className="mt-2 text-3xl font-semibold text-red-800">{stats.errors}</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">ARR en riesgo</p>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {stats.totalImpact > 0 ? formatEUR(stats.totalImpact) : "-"}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">{stats.unclassified} productos sin clasificar</p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-stone-100 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Revisadas</p>
          <p className="mt-2 text-3xl font-semibold text-stone-800">{stats.reviewed}</p>
        </div>
      </section>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-3xl border border-stone-200 bg-white" />
          ))}
        </div>
      )}

      {isError && (
        <div data-testid="alerts-error" className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-red-900">No se pudieron cargar las alertas</p>
          <p className="mt-1 text-sm text-red-800">
            {getAPIErrorMessage(error, "Error al consultar la bandeja de alertas.")}
          </p>
        </div>
      )}

      {!isLoading && !isError && (alerts?.length ?? 0) === 0 && (
        <div data-testid="alerts-empty" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
          <p className="text-lg font-semibold text-emerald-800">No hay alertas para este filtro</p>
          <p className="mt-2 text-sm text-emerald-700">
            Ajusta el tipo o activa las revisadas para ver el historico del snapshot.
          </p>
        </div>
      )}

      <div className="space-y-4" data-testid="alerts-list">
        {(alerts ?? []).map((alert) => {
          const lineItemId = alert.arr_line_item_id;
          const isExcluded = lineItemId != null ? (exclusionState[lineItemId] ?? false) : false;
          return (
            <AlertCard
              key={alert.id}
              alert={alert}
              expanded={expandedAlertId === alert.id}
              note={noteInput[alert.id] ?? alert.review_note ?? ""}
              onToggle={() =>
                setExpandedAlertId((current) => (current === alert.id ? "" : alert.id))
              }
              onNoteChange={(value) => setNoteInput((prev) => ({ ...prev, [alert.id]: value }))}
              onMarkReviewed={() =>
                mutation.mutate({ id: alert.id, note: noteInput[alert.id] ?? alert.review_note ?? "" })
              }
              isMutating={mutation.isPending}
              isExcluded={isExcluded}
              onToggleExclusion={
                lineItemId
                  ? () => exclusionMutation.mutate({ lineItemId, excluded: !isExcluded })
                  : undefined
              }
              isExclusionMutating={exclusionMutation.isPending}
              onApplyFix={
                alert.alert_type === "UNCLASSIFIED_PRODUCT" && alert.product_name
                  ? (productType) => fixMutation.mutate({ alert, productType })
                  : undefined
              }
              isFixMutating={fixMutation.isPending}
            />
          );
        })}
      </div>

      {(mutation.isError || fixMutation.isError) && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          {mutation.isError
            ? getAPIErrorMessage(mutation.error, "No se pudo actualizar la alerta.")
            : getAPIErrorMessage(fixMutation.error, "No se pudo guardar la clasificacion.")}
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl p-6 text-sm text-stone-500">Cargando alertas...</div>}>
      <AlertsPageContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import type { AlertOut } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  ERROR: "border-red-200 bg-red-50 text-red-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  INFO: "border-sky-200 bg-sky-50 text-sky-700",
};

function severityLabel(severity: string): string {
  const normalized = severity.toUpperCase();
  const labels: Record<string, string> = {
    ERROR: "Error",
    WARNING: "Warning",
    INFO: "Info",
  };
  return labels[normalized] ?? severity;
}

function alertTypeLabel(alertType: string): string {
  const labels: Record<string, string> = {
    UNCLASSIFIED_PRODUCT: "Producto sin clasificar",
    MISSING_START_DATE: "Fecha de inicio ausente",
    MISSING_END_DATE: "Fecha de fin ausente",
    LONG_SERVICE_PERIOD: "Duracion anomala",
  };
  return labels[alertType] ?? alertType.replaceAll("_", " ");
}

export function AlertsPanel({
  alerts,
  loading = false,
}: {
  alerts: AlertOut[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Alertas pendientes</h2>
            <p className="text-sm text-stone-500">Cargando alertas del snapshot activo...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl border border-stone-200 bg-stone-50"
            />
          ))}
        </div>
      </section>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  const preview = alerts.slice(0, 3);

  return (
    <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Alertas pendientes</h2>
          <p className="text-sm text-stone-600">
            Hay {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} sin revisar en el
            snapshot activo.
          </p>
        </div>
        <Link
          href="/alerts"
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
        >
          Abrir bandeja de alertas
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {preview.map((alert) => {
          const severity = alert.severity.toUpperCase();
          return (
            <article
              key={alert.id}
              className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-stone-900">
                    {alert.opportunity_name ?? "Oportunidad sin nombre"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    {alertTypeLabel(alert.alert_type)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    SEVERITY_STYLES[severity] ?? "border-stone-200 bg-stone-100 text-stone-700"
                  }`}
                >
                  {severityLabel(severity)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-stone-600">{alert.description}</p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">
                {alert.account_name && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-1">
                    Cliente: {alert.account_name}
                  </span>
                )}
                {alert.product_name && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-1">
                    Producto: {alert.product_name}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Link
                  href={`/alerts?alertId=${alert.id}`}
                  className="text-sm font-medium text-amber-800 transition hover:text-amber-900"
                >
                  Ver detalle
                </Link>
                {alert.alert_type === "UNCLASSIFIED_PRODUCT" && alert.product_name && (
                  <Link
                    href={`/config?product=${encodeURIComponent(alert.product_name)}&fromAlert=${alert.id}`}
                    className="text-sm font-medium text-stone-700 transition hover:text-stone-900"
                  >
                    Ir a configuracion
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

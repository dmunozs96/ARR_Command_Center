"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { AlertOut } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  ERROR: "border-[#ffd0cd] bg-[#fff0ef] text-[#b82f2a]",
  WARNING: "border-[#ffe2a8] bg-[#fff7e7] text-[#946300]",
  INFO: "border-[#cbeeff] bg-[#eefaff] text-[#006f94]",
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

export function AlertsPanel({ alerts, loading = false }: { alerts: AlertOut[]; loading?: boolean }) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-[#e7e1f2] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
        <div className="h-5 w-44 animate-pulse rounded bg-[#e4dcf1]" />
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-[#f4f0fb]" />
          ))}
        </div>
      </section>
    );
  }

  if (alerts.length === 0) {
    return (
      <section className="rounded-3xl border border-[#bfefe4] bg-[#e9fbf7] p-5 shadow-[0_18px_50px_rgba(49,24,95,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#20c7a8] text-white">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#151229]">Sin alertas pendientes</h2>
            <p className="text-sm font-medium text-[#0c7564]">El snapshot activo no tiene incidencias abiertas.</p>
          </div>
        </div>
      </section>
    );
  }

  const preview = alerts.slice(0, 3);

  return (
    <section className="rounded-3xl border border-[#ffe2a8] bg-white p-5 shadow-[0_18px_50px_rgba(49,24,95,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffb020] text-white">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#151229]">Alertas pendientes</h2>
            <p className="text-sm font-medium text-[#6f6a80]">
              {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} sin revisar en el snapshot activo.
            </p>
          </div>
        </div>
        <Link
          href="/alerts"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 text-sm font-black text-[#2f185f] transition hover:border-[#6d35ff]"
        >
          Abrir bandeja
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {preview.map((alert) => {
          const severity = alert.severity.toUpperCase();
          return (
            <article key={alert.id} className="rounded-2xl border border-[#eee8f8] bg-[#fbfaff] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="line-clamp-1 text-sm font-black text-[#151229]">
                    {alert.opportunity_name ?? "Oportunidad sin nombre"}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]">
                    {alertTypeLabel(alert.alert_type)}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${SEVERITY_STYLES[severity] ?? "border-[#e7e1f2] bg-white text-[#6f6a80]"}`}>
                  {severityLabel(severity)}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6f6a80]">{alert.description}</p>
              <Link href={`/alerts?alertId=${alert.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[#6d35ff]">
                Ver detalle
                <ArrowRight size={15} />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import type { BLDistributionStats, ImplementationAlertItem } from "@/lib/types";
import { formatEUR } from "@/lib/utils";
import { PRODUCT_TYPE_COLORS } from "@/lib/constants";

interface Props {
  alerts: ImplementationAlertItem[];
  blDistributions: Record<string, BLDistributionStats>;
}

function percentileColor(pct: number): string {
  if (pct <= 50) return "#22c55e";
  if (pct <= 75) return "#f59e0b";
  if (pct <= 90) return "#f97316";
  return "#ef4444";
}

function PercentileBar({
  item,
  blDistributions,
}: {
  item: ImplementationAlertItem;
  blDistributions: Record<string, BLDistributionStats>;
}) {
  const pt = item.product_type ?? "";
  const stats = blDistributions[pt];

  if (!item.is_statistically_reliable) {
    const n = stats?.sample_size ?? 0;
    return (
      <span
        className="text-xs text-[#9ca3af]"
        title="La muestra histórica de esta BL es insuficiente para calcular un percentil fiable."
      >
        — (N={n})
      </span>
    );
  }

  const pct = item.percentile_rank ?? 0;
  const color = percentileColor(pct);

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="relative flex-1 h-1.5 rounded-full bg-[#e5e7eb]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {pct.toFixed(0)}th
      </span>
    </div>
  );
}

function formatDateES(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function ImplementationAlertsTable({ alerts, blDistributions }: Props) {
  return (
    <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
      <h2 className="text-base font-bold text-[#2f185f]">Alertas de Implantación</h2>
      <p className="mt-1 text-xs text-[#9ca3af]">
        Contratos comparados contra el comportamiento histórico de su propia línea de negocio.
        Un contrato al percentil 90 lleva más tiempo sin implementarse que el 90% de los contratos
        históricos de su BL.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#f0ebff] text-xs font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">
              <th className="py-2 pr-4 text-left">Cliente</th>
              <th className="py-2 pr-4 text-left hidden md:table-cell">Oportunidad</th>
              <th className="py-2 pr-4 text-left">Línea</th>
              <th className="py-2 pr-4 text-right">ARR</th>
              <th className="py-2 pr-4 text-left">Fecha cierre</th>
              <th className="py-2 pr-4 text-right">Días esp.</th>
              <th className="py-2 pr-4 text-right">Mediana BL</th>
              <th className="py-2 text-left">Percentil</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a, i) => (
              <tr
                key={i}
                className={`border-b border-[#f7f3ff] hover:bg-[#fbfaff] transition-colors ${
                  !a.is_statistically_reliable ? "opacity-70" : ""
                }`}
              >
                <td className="py-2.5 pr-4 font-medium text-[#2f185f]">
                  {a.account_name ?? "—"}
                </td>
                <td className="py-2.5 pr-4 text-xs text-[#9ca3af] hidden md:table-cell">
                  {a.opportunity_name ?? "—"}
                </td>
                <td className="py-2.5 pr-4">
                  {a.product_type ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: PRODUCT_TYPE_COLORS[a.product_type] ?? "#6f6a80",
                      }}
                    >
                      {a.product_type}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-[#2f185f]">
                  {formatEUR(a.arr_value)}
                </td>
                <td className="py-2.5 pr-4 text-[#6f6a80]">{formatDateES(a.close_date)}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-[#2f185f]">
                  {a.days_since_close} días
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-[#6f6a80]">
                  {Math.round(a.bl_median_days)} días
                </td>
                <td className="py-2.5">
                  <PercentileBar item={a} blDistributions={blDistributions} />
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-[#9ca3af]">
                  No hay contratos en tránsito actualmente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

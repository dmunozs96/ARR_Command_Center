"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import type { DeltaContractItem } from "@/lib/types";
import { formatEUR, formatMonth } from "@/lib/utils";
import { PRODUCT_TYPE_COLORS } from "@/lib/constants";

type SortKey = keyof Pick<DeltaContractItem, "arr_value" | "days_since_close" | "account_name">;

interface Props {
  availableMonths: string[];
  snapshotId: string;
  productType?: string;
  accountName?: string;
}

function formatDateES(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function DeltaMonthBreakdown({ availableMonths, snapshotId, productType, accountName }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[availableMonths.length - 1] ?? ""
  );
  const [sortKey, setSortKey] = useState<SortKey>("days_since_close");
  const [sortAsc, setSortAsc] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["delta-breakdown", snapshotId, selectedMonth, productType, accountName],
    queryFn: () =>
      api.getDeltaMonthBreakdown({
        snapshot_id: snapshotId,
        month: selectedMonth,
        product_type: productType,
        account_name: accountName,
      }),
    enabled: !!snapshotId && !!selectedMonth,
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = useMemo(() => {
    if (!data?.contracts) return [];
    return [...data.contracts].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [data, sortKey, sortAsc]);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortAsc ? (
      <ChevronUp size={13} className="inline ml-0.5" />
    ) : (
      <ChevronDown size={13} className="inline ml-0.5" />
    );
  }

  return (
    <div className="rounded-2xl border border-[#e7e1f2] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#2f185f]">Radiografía del Mes</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-[#e7e1f2] bg-white px-3 py-1.5 text-sm text-[#2f185f] focus:outline-none focus:ring-2 focus:ring-[#6d35ff]/30"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <p className="mt-6 text-center text-sm text-[#9ca3af]">Cargando…</p>
      )}

      {!isLoading && data && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0ebff] text-xs font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">
                  <th
                    className="py-2 pr-4 text-left cursor-pointer hover:text-[#6d35ff]"
                    onClick={() => handleSort("account_name")}
                  >
                    Cliente <SortIcon k="account_name" />
                  </th>
                  <th className="py-2 pr-4 text-left">Línea</th>
                  <th
                    className="py-2 pr-4 text-right cursor-pointer hover:text-[#6d35ff]"
                    onClick={() => handleSort("arr_value")}
                  >
                    ARR <SortIcon k="arr_value" />
                  </th>
                  <th className="py-2 pr-4 text-left">Fecha cierre</th>
                  <th className="py-2 pr-4 text-left">Inicio previsto</th>
                  <th
                    className="py-2 text-right cursor-pointer hover:text-[#6d35ff]"
                    onClick={() => handleSort("days_since_close")}
                  >
                    Días esperando <SortIcon k="days_since_close" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#f7f3ff] hover:bg-[#fbfaff] transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-medium text-[#2f185f]">
                      {c.account_name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {c.product_type ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              PRODUCT_TYPE_COLORS[c.product_type] ?? "#6f6a80",
                          }}
                        >
                          {c.product_type}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[#2f185f]">
                      {formatEUR(c.arr_value)}
                    </td>
                    <td className="py-2.5 pr-4 text-[#6f6a80]">{formatDateES(c.close_date)}</td>
                    <td className="py-2.5 pr-4 text-[#6f6a80]">
                      {formatDateES(c.subscription_start_date)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-[#2f185f]">
                      {c.days_since_close} días
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[#9ca3af]">
                      No hay contratos en tránsito para este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#9ca3af]">
            Contratos con fecha de cierre anterior o igual a{" "}
            <strong>{formatMonth(selectedMonth)}</strong> cuyo servicio no había comenzado en ese
            mes.
          </p>
        </>
      )}
    </div>
  );
}

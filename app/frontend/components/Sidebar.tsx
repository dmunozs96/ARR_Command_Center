"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BrainCircuit,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  Database,
  LayoutDashboard,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { SnapshotSelector } from "@/components/SnapshotSelector";
import { ARRModeToggle } from "@/components/ARRModeToggle";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Building2 },
  { href: "/snapshots", label: "Snapshots", icon: Database },
  { href: "/consultants", label: "Consultores", icon: UsersRound },
  { href: "/stripe", label: "Stripe MRR", icon: WalletCards },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/config", label: "Configuracion", icon: Settings },
];

const NAV_EXPERT = [
  { href: "/expert", label: "ARR Expert", icon: BrainCircuit },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#e7e1f2] bg-white/90 px-4 py-5 shadow-[8px_0_30px_rgba(49,24,95,0.06)] backdrop-blur xl:flex">
      <div className="rounded-2xl bg-[#2f185f] p-4 text-white shadow-lg shadow-[#6d35ff]/15">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6d35ff]">
            <ChartNoAxesCombined size={22} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d8caff]">
              isEazy Finance
            </p>
            <h1 className="text-lg font-black tracking-tight">ARR Center</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-5 text-[#efe9ff]">
          Cuadro de mandos financiero para ARR, MRR y calidad de datos.
        </p>
      </div>

      <SnapshotSelector className="mt-5" />
      <ARRModeToggle className="mt-4" />

      <nav className="mt-5 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-[#efe9ff] text-[#2f185f] shadow-sm"
                  : "text-[#6f6a80] hover:bg-[#f7f3ff] hover:text-[#2f185f]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    active ? "bg-[#6d35ff] text-white" : "bg-[#f4f0fb] text-[#6d35ff]"
                  }`}
                >
                  <Icon size={18} />
                </span>
                {item.label}
              </span>
              {active && <ChevronRight size={16} />}
            </Link>
          );
        })}

        <div className="pt-3">
          {NAV_EXPERT.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#2f185f] text-white shadow-sm"
                    : "text-[#6d35ff] hover:bg-[#efe9ff] hover:text-[#2f185f]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      active ? "bg-[#6d35ff] text-white" : "bg-[#efe9ff] text-[#6d35ff]"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  {item.label}
                </span>
                {active && <ChevronRight size={16} />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d35ff]">v0.9.0</p>
        <p className="mt-1 text-sm font-semibold text-[#2f185f]">Executive dashboard</p>
        <p className="mt-1 text-xs leading-5 text-[#6f6a80]">
          Preparado para vistas por periodo, linea, pais y consultor.
        </p>
      </div>
    </aside>
  );
}

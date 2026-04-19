"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SnapshotSelector } from "@/components/SnapshotSelector";

const NAV = [
  { href: "/", label: "Dashboard", icon: "Chart" },
  { href: "/snapshots", label: "Snapshots", icon: "Clock" },
  { href: "/consultants", label: "Consultores", icon: "Team" },
  { href: "/stripe", label: "Stripe MRR", icon: "MRR" },
  { href: "/alerts", label: "Alertas", icon: "Warn" },
  { href: "/config", label: "Configuracion", icon: "Cfg" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 sticky top-0">
      <div className="border-b border-slate-800 px-5 py-5">
        <h1 className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
          ARR Command Center
        </h1>
        <p className="mt-1 text-xs text-slate-400">isEazy Finance</p>
        <SnapshotSelector className="mt-4" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/40"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="inline-flex min-w-10 justify-center rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
        v0.8.0 - Fase H
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/consultants", label: "Consultores", icon: "👥" },
  { href: "/stripe", label: "Stripe MRR", icon: "💳" },
  { href: "/alerts", label: "Alertas", icon: "⚠️" },
  { href: "/config", label: "Configuración", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
          ARR Command Center
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">isEazy Finance</p>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
        v0.3.0 — Fase C
      </div>
    </aside>
  );
}

"use client";

import { useARRMode } from "@/lib/arr-mode-context";

interface Props {
  className?: string;
}

export function ARRModeToggle({ className = "" }: Props) {
  const { arrMode, setArrMode } = useARRMode();

  return (
    <div className={`rounded-2xl border border-[#e7e1f2] bg-white p-1 text-sm font-black text-[#2f185f] ${className}`}>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setArrMode("from_start")}
          className={`rounded-xl px-3 py-2 transition ${
            arrMode === "from_start"
              ? "bg-[#6d35ff] text-white shadow-lg shadow-[#6d35ff]/20"
              : "hover:bg-[#f4f0fb]"
          }`}
        >
          Desde inicio
        </button>
        <button
          type="button"
          onClick={() => setArrMode("from_close")}
          className={`rounded-xl px-3 py-2 transition ${
            arrMode === "from_close"
              ? "bg-[#6d35ff] text-white shadow-lg shadow-[#6d35ff]/20"
              : "hover:bg-[#f4f0fb]"
          }`}
        >
          Desde cierre
        </button>
      </div>
    </div>
  );
}

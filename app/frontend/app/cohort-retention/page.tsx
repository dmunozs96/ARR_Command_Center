import { Info, UsersRound } from "lucide-react";
import { CohortRetentionView } from "@/components/CohortRetentionView";

export default function CohortRetentionPage() {
  return (
    <main className="flex-1 space-y-6 p-6" data-testid="cohort-retention-page">
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efe9ff] text-[#6d35ff]">
            <UsersRound size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]">Retencion historica</p>
            <h1 className="text-2xl font-black tracking-tight text-[#151229]">Retencion de cohorte</h1>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#6f6a80]">
          <Info size={14} />
          Analisis LTM/YTD de la base existente entre el mes inicial de cohorte y el mes de medicion.
        </p>
      </header>

      <CohortRetentionView />
    </main>
  );
}

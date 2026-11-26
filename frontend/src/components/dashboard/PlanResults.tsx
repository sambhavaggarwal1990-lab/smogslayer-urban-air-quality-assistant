import { ShieldAlert } from "lucide-react";
import { useEffect, useRef } from "react";

import type { Plan } from "@/lib/api";
import { AirCard } from "./results/AirCard";
import { CopyButton } from "./results/CopyButton";
import { ImpactCard } from "./results/ImpactCard";
import { OutlookCard } from "./results/OutlookCard";
import { RoutinePledge } from "./results/RoutinePledge";
import { TipList } from "./results/TipList";

/** Lays out everything the backend returned, from the safety alert down to the disclaimer. */
export function PlanResults({ plan }: { plan: Plan }) {
  const { air, alert, outlook, impact, advice, disclaimer } = plan;
  const region = useRef<HTMLElement>(null);

  // Move keyboard and screen-reader focus to the results when they appear, so users don't have to search for them.
  useEffect(() => region.current?.focus(), []);

  return (
    <section
      ref={region}
      tabIndex={-1}
      aria-label="Your air quality plan"
      className="space-y-8 focus:outline-none"
    >
      {alert && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-950/40 p-5 text-red-100"
        >
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />
          <p className="font-semibold">{alert}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Be honest about who wrote the tips. */}
        <p className="text-xs text-slate-300">
          {advice.source === "gemini"
            ? "Tips written by Gemini"
            : "Built-in tips (AI unavailable right now)"}
        </p>
        <CopyButton plan={plan} />
      </div>

      <AirCard air={air} />
      {outlook && <OutlookCard outlook={outlook} />}
      <ImpactCard impact={impact} />
      <RoutinePledge tips={advice.routine} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TipList title="Indoor air quality hacks" tips={advice.indoor} />
        <TipList title="Sustainable alternatives" tips={advice.alternatives} />
      </div>

      <footer className="space-y-2 border-t border-slate-800/60 pt-6 text-center text-xs text-slate-300">
        <p>{disclaimer}</p>
        <p>
          Air-quality data: Open-Meteo (CC BY 4.0). Values are modelled estimates. CO₂ figures use
          UK government emission factors as a rough guide. Nothing you enter is stored.
        </p>
      </footer>
    </section>
  );
}

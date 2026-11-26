import type { CommuteMode, Plan } from "@/lib/api";
import { CARD_CLASS } from "../styles";

/** How each commute mode is written inside a sentence. */
const MODE_LABEL: Record<CommuteMode, string> = {
  car: "car",
  motorbike: "motorbike",
  bus: "bus",
  metro: "metro",
  walk_or_cycle: "walking or cycling",
};

/** Monthly CO2 of the user's commute, and how much each cleaner mode would save. */
export function ImpactCard({ impact }: { impact: Plan["impact"] }) {
  return (
    <section className={CARD_CLASS}>
      <h2 className="text-lg font-bold text-white">Your commute impact</h2>
      <p className="text-sm text-slate-300">
        Commuting by {MODE_LABEL[impact.mode]} adds roughly{" "}
        <strong className="text-amber-300">{impact.monthly_co2_kg} kg CO₂ a month</strong>.
      </p>

      {impact.switches.length === 0 && (
        <p className="text-sm text-emerald-300">You already use the cleanest option.</p>
      )}

      {impact.switches.map((option) => (
        <div key={option.mode} className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-200">
            <span>Switch to {MODE_LABEL[option.mode]}</span>
            <span className="font-mono text-emerald-300">saves {option.saves_kg} kg / month</span>
          </div>
          {/* The bar shows the saving as a share of today's emissions. */}
          <div className="h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
            <div
              style={{ width: `${Math.round((option.saves_kg / impact.monthly_co2_kg) * 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            />
          </div>
        </div>
      ))}
    </section>
  );
}

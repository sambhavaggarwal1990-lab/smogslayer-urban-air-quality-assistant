import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { Plan } from "@/lib/api";
import { FOCUS_RING } from "../styles";

/** Copies a one-paragraph summary of the plan so it can be pasted into a chat. */
export function CopyButton({ plan }: { plan: Plan }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const { air, outlook, impact } = plan;
    const best = outlook ? ` Best time outside: ${outlook.best.label}.` : "";
    const text = `Air in ${air.city} right now: AQI ${air.aqi} (${air.category}).${best} My commute adds about ${impact.monthly_co2_kg} kg CO₂ a month. Checked with SmogSlayer.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000); // go back to "Copy summary" after 3 seconds
    } catch {
      // The browser blocked clipboard access; there is nothing useful to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 ${FOCUS_RING}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy summary"}
    </button>
  );
}

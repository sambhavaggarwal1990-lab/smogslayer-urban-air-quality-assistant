import { Check, Copy, Flame, ShieldAlert } from "lucide-react";
import { useState } from "react";

import type { CommuteMode, Plan } from "@/lib/api";
import { completeToday, currentStreak } from "@/lib/streak";

const MODE_LABEL: Record<CommuteMode, string> = {
  car: "car",
  motorbike: "motorbike",
  bus: "bus",
  metro: "metro",
  walk_or_cycle: "walking or cycling",
};

// Tailwind needs complete class names, so every AQI band spells them out.
const MODERATE = { bar: "bg-yellow-400", text: "text-yellow-300" };
const BAND: Record<string, { bar: string; text: string }> = {
  Good: { bar: "bg-emerald-500", text: "text-emerald-300" },
  Moderate: MODERATE,
  "Unhealthy for sensitive groups": { bar: "bg-orange-500", text: "text-orange-300" },
  Unhealthy: { bar: "bg-red-500", text: "text-red-300" },
  "Very unhealthy": { bar: "bg-purple-500", text: "text-purple-300" },
  Hazardous: { bar: "bg-rose-800", text: "text-rose-300" },
};
const bandOf = (category: string) => BAND[category] ?? MODERATE;

const card =
  "space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8";

function CopyButton({ plan }: { plan: Plan }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const { air, outlook, impact } = plan;
    const best = outlook ? ` Best time outside: ${outlook.best.label}.` : "";
    const text = `Air in ${air.city} right now: AQI ${air.aqi} (${air.category}).${best} My commute adds about ${impact.monthly_co2_kg} kg CO₂ a month. Checked with SmogSlayer.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* clipboard blocked by the browser: nothing to do */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy summary"}
    </button>
  );
}

function AirCard({ air }: { air: Plan["air"] }) {
  const { text } = bandOf(air.category);
  return (
    <section className={`${card} flex flex-col items-center gap-2 text-center`}>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
        Air in {[air.city, air.country].filter(Boolean).join(", ")}
      </h2>
      <p className={`text-7xl font-black tracking-tighter ${text}`}>{air.aqi}</p>
      <p className={`text-lg font-bold ${text}`}>US AQI: {air.category}</p>
      <p className="font-mono text-sm text-slate-300">
        PM2.5: <strong className="text-white">{air.pm25} µg/m³</strong>
      </p>
    </section>
  );
}

function Outlook({ outlook }: { outlook: NonNullable<Plan["outlook"]> }) {
  const { hours, best, worst } = outlook;
  return (
    <section className={card}>
      <h2 className="text-lg font-bold text-white">The next 24 hours</h2>
      <p className="text-xs text-slate-300">Hourly forecast from Open-Meteo model data</p>
      <div aria-hidden className="flex h-40 items-end gap-1">
        {hours.map((hour) => {
          const mark =
            hour.label === best.label
              ? "ring-2 ring-emerald-300"
              : hour.label === worst.label
                ? "ring-2 ring-rose-300"
                : "";
          return (
            <div
              key={hour.label}
              title={`${hour.label}: AQI ${hour.aqi} (${hour.category})`}
              style={{ height: `${Math.min(100, Math.round((hour.aqi / 300) * 100))}%` }}
              className={`flex-1 rounded-t-md ${bandOf(hour.category).bar} ${mark}`}
            />
          );
        })}
      </div>
      <p className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-sm text-slate-200">
        Best time to be outside: <strong>{best.label}</strong> (AQI {best.aqi}). Roughest:{" "}
        <strong>{worst.label}</strong> (AQI {worst.aqi}).
      </p>
    </section>
  );
}

function Impact({ impact }: { impact: Plan["impact"] }) {
  return (
    <section className={card}>
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

function Pledge({ tips }: { tips: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => tips.map(() => false));
  const [streak, setStreak] = useState(currentStreak);

  function toggle(index: number) {
    const next = checked.map((value, i) => (i === index ? !value : value));
    setChecked(next);
    setStreak(next.every(Boolean) ? completeToday() : currentStreak());
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Today's low-emission routine</h2>
          <p className="text-xs text-slate-300">
            Tick every action to extend your clean-air streak
          </p>
        </div>
        <p
          aria-live="polite"
          className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300"
        >
          <Flame className="h-4 w-4" /> Streak: {streak} day(s)
        </p>
      </div>
      <ul className="space-y-3">
        {tips.map((tip, index) => (
          <li key={`${index}-${tip}`}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                checked[index]
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => toggle(index)}
                className="mt-0.5 h-5 w-5 accent-emerald-500"
              />
              <span
                className={`text-sm font-medium ${checked[index] ? "text-white line-through opacity-80" : "text-slate-200"}`}
              >
                {tip}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TipList({ title, tips }: { title: string; tips: string[] }) {
  return (
    <section className={card}>
      <h2 className="text-base font-bold text-white">{title}</h2>
      <ul className="list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-200">
        {tips.map((tip, index) => (
          <li key={`${index}-${tip}`}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}

export function PlanResults({ plan }: { plan: Plan }) {
  const { air, alert, outlook, impact, advice, disclaimer } = plan;
  return (
    <div className="space-y-8">
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
        <p className="text-xs text-slate-300">
          {advice.source === "gemini"
            ? "Tips written by Gemini"
            : "Built-in tips (AI unavailable right now)"}
        </p>
        <CopyButton plan={plan} />
      </div>
      <AirCard air={air} />
      {outlook && <Outlook outlook={outlook} />}
      <Impact impact={impact} />
      <Pledge tips={advice.routine} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TipList title="Indoor air quality hacks" tips={advice.indoor} />
        <TipList title="Sustainable alternatives" tips={advice.alternatives} />
      </div>
      <footer className="space-y-2 border-t border-slate-800/60 pt-6 text-center text-xs text-slate-300">
        <p>{disclaimer}</p>
        <p>
          Air-quality data: Open-Meteo (CC BY 4.0). Values are modelled estimates. Nothing you enter
          is stored.
        </p>
      </footer>
    </div>
  );
}

import type { Plan } from "@/lib/api";
import { CARD_CLASS } from "../styles";
import { bandStyle } from "./aqi-bands";

/** The next 24 hours as a bar chart, plus a sentence naming the best and roughest hour. */
export function OutlookCard({ outlook }: { outlook: NonNullable<Plan["outlook"]> }) {
  const { hours, best, worst } = outlook;

  return (
    <section className={CARD_CLASS}>
      <h2 className="text-lg font-bold text-white">The next 24 hours</h2>
      <p className="text-xs text-slate-300">Hourly forecast from Open-Meteo model data</p>

      {/* The chart is decorative: the sentence below says the same thing in words, which is what screen readers get. */}
      <div aria-hidden className="flex h-40 items-end gap-1">
        {hours.map((hour) => {
          // A ring marks the best (green) and roughest (red) hour.
          const ring =
            hour.label === best.label
              ? "ring-2 ring-emerald-300"
              : hour.label === worst.label
                ? "ring-2 ring-rose-300"
                : "";
          return (
            <div
              key={hour.label}
              title={`${hour.label}: AQI ${hour.aqi} (${hour.category})`}
              style={{ height: `${Math.min(100, Math.round((hour.aqi / 300) * 100))}%` }} // 300 AQI fills the chart
              className={`flex-1 rounded-t-md ${bandStyle(hour.category).bar} ${ring}`}
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

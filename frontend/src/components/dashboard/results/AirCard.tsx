import type { Plan } from "@/lib/api";
import { CARD_CLASS } from "../styles";
import { bandStyle } from "./aqi-bands";

/** The headline number: today's US AQI for the city, its category and PM2.5. */
export function AirCard({ air }: { air: Plan["air"] }) {
  const { text } = bandStyle(air.category);
  const place = [air.city, air.country].filter(Boolean).join(", "); // the country can be missing

  return (
    <section className={`${CARD_CLASS} flex flex-col items-center gap-2 text-center`}>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Air in {place}</h2>
      <p className={`text-7xl font-black tracking-tighter ${text}`}>{air.aqi}</p>
      <p className={`text-lg font-bold ${text}`}>US AQI: {air.category}</p>
      <p className="font-mono text-sm text-slate-300">
        PM2.5: <strong className="text-white">{air.pm25} µg/m³</strong>
      </p>
    </section>
  );
}

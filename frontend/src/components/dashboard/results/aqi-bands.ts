/** Colours for each AQI category. */

export type BandStyle = { bar: string; text: string };

// Tailwind only keeps class names it can read in the source, so every class is written out in full.
const MODERATE: BandStyle = { bar: "bg-yellow-400", text: "text-yellow-300" };

const BANDS: Record<string, BandStyle> = {
  Good: { bar: "bg-emerald-500", text: "text-emerald-300" },
  Moderate: MODERATE,
  "Unhealthy for sensitive groups": { bar: "bg-orange-500", text: "text-orange-300" },
  Unhealthy: { bar: "bg-red-500", text: "text-red-300" },
  "Very unhealthy": { bar: "bg-purple-500", text: "text-purple-300" },
  Hazardous: { bar: "bg-rose-800", text: "text-rose-300" },
};

/** Colours for a category name. An unknown name falls back to the "Moderate" look so the page never breaks. */
export function bandStyle(category: string): BandStyle {
  return BANDS[category] ?? MODERATE;
}

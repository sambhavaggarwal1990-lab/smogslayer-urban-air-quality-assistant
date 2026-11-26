import type { Plan } from "@/lib/api";

/** A realistic backend answer (Delhi, a bad air day), reused by several tests. */
export const PLAN: Plan = {
  air: { city: "Delhi", country: "India", aqi: 229, pm25: 148.2, category: "Very unhealthy" },
  alert: "Air is very unhealthy. Stay indoors where you can and skip outdoor exercise.",
  outlook: {
    hours: [
      { label: "8 AM", aqi: 190, category: "Unhealthy" },
      { label: "9 PM", aqi: 231, category: "Very unhealthy" },
    ],
    best: { label: "8 AM", aqi: 190, category: "Unhealthy" },
    worst: { label: "9 PM", aqi: 231, category: "Very unhealthy" },
  },
  impact: {
    mode: "motorbike",
    monthly_co2_kg: 52.8,
    switches: [
      { mode: "walk_or_cycle", saves_kg: 52.8 },
      { mode: "metro", saves_kg: 31.7 },
    ],
  },
  advice: {
    source: "gemini",
    routine: [
      "Avoid outdoor exercise",
      "Postpone non-essential travel",
      "Wear an N95 mask outside",
    ],
    indoor: ["Keep windows shut near rush hour"],
    alternatives: ["Take the metro instead of the motorbike"],
  },
  disclaimer: "General guidance, not medical advice.",
};

/** A fake successful `fetch` response carrying `body` as JSON. */
export const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

/** A fake failed `fetch` response; `body` can be anything, including something that is not JSON. */
export const errorResponse = (status: number, body: unknown) =>
  ({ ok: false, status, json: async () => body }) as Response;

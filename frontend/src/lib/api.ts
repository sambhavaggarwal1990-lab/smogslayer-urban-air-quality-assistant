/**
 * Talks to the SmogSlayer backend (the Flask API in ../backend).
 *
 * The types below mirror the JSON that `POST /api/plan` returns, so the rest of the app can rely on them.
 */

export type CommuteMode = "car" | "motorbike" | "bus" | "metro" | "walk_or_cycle";
export type Language = "en" | "hi" | "hinglish";

/** What the user fills in on the form. Sent to the backend as JSON. */
export type PlanRequest = {
  city: string;
  commute_mode: CommuteMode;
  one_way_km: number;
  sensitive_group: boolean; // children, older adults or someone with asthma at home
  has_purifier: boolean;
  language: Language;
};

/** One hour of the 24-hour forecast. */
export type Hour = { label: string; aqi: number; category: string };

/** The backend's answer. Every number in it was calculated by code; only the tips are written by Gemini. */
export type Plan = {
  air: { city: string; country: string; aqi: number; pm25: number; category: string };
  alert: string | null; // fixed safety text, null when the air is fine
  outlook: { hours: Hour[]; best: Hour; worst: Hour } | null; // null when no forecast is available
  impact: {
    mode: CommuteMode;
    monthly_co2_kg: number;
    switches: { mode: CommuteMode; saves_kg: number }[];
  };
  advice: {
    source: "gemini" | "built-in";
    routine: string[];
    indoor: string[];
    alternatives: string[];
  };
  disclaimer: string;
};

const HOSTED_API_URL = "https://smogslayer-api.onrender.com";
const LOCAL_API_URL = "http://127.0.0.1:5001";

/**
 * Which API address to call.
 * An explicit VITE_API_URL always wins; otherwise a page running on localhost uses the local backend
 * and every other address (the published site) uses the hosted one.
 */
export function apiUrlFor(hostname: string, configured?: string): string {
  if (configured) return configured;
  return ["localhost", "127.0.0.1"].includes(hostname) ? LOCAL_API_URL : HOSTED_API_URL;
}

/**
 * Ask the backend for a plan.
 * Throws an Error whose message is safe to show to the user: either the backend's own message
 * (for example "We couldn't find that city") or a generic one.
 */
export async function fetchPlan(request: PlanRequest): Promise<Plan> {
  const base = apiUrlFor(window.location.hostname, import.meta.env.VITE_API_URL);

  let response: Response;
  try {
    response = await fetch(`${base}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("Can't reach the SmogSlayer server. Please try again.");
  }

  // The body may not be JSON at all (for example a proxy error page), so a failed parse is not fatal.
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as Plan;
}

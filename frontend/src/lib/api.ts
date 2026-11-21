export type CommuteMode = "car" | "motorbike" | "bus" | "metro" | "walk_or_cycle";
export type Language = "en" | "hi" | "hinglish";

export type PlanRequest = {
  city: string;
  commute_mode: CommuteMode;
  one_way_km: number;
  sensitive_group: boolean;
  has_purifier: boolean;
  language: Language;
};

type Hour = { label: string; aqi: number; category: string };

export type Plan = {
  air: { city: string; country: string; aqi: number; pm25: number; category: string };
  alert: string | null;
  outlook: { hours: Hour[]; best: Hour; worst: Hour } | null;
  impact: { mode: CommuteMode; monthly_co2_kg: number; switches: { mode: CommuteMode; saves_kg: number }[] };
  advice: { source: "gemini" | "built-in"; routine: string[]; indoor: string[]; alternatives: string[] };
  disclaimer: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5001";

/** Ask the SmogSlayer backend for a plan. Throws an Error with a message that is safe to show. */
export async function fetchPlan(request: PlanRequest): Promise<Plan> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("Can't reach the SmogSlayer server. Please try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as Plan;
}

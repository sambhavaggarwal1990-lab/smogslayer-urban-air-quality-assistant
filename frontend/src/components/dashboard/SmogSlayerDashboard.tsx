import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { fetchPlan, type Plan, type PlanRequest } from "@/lib/api";
import { PlanForm } from "./PlanForm";
import { PlanResults } from "./PlanResults";
import { FOCUS_RING } from "./styles";

/**
 * The whole dashboard: a header, plus either the input form or the results.
 *
 * It owns the state of the request (loading, error, last answer). The form and the results are
 * separate components that only receive what they need.
 */
export function SmogSlayerDashboard() {
  const [plan, setPlan] = useState<Plan | null>(null); // the latest answer; null means "show the form"
  const [lastRequest, setLastRequest] = useState<PlanRequest | null>(null); // remembered so "Edit inputs" restores the form
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /** Ask the backend for a plan; on failure keep the form visible and show why. */
  async function handleSubmit(request: PlanRequest) {
    setLoading(true);
    setError("");
    setLastRequest(request);
    try {
      setPlan(await fetchPlan(request));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* Lets keyboard users jump past the header. Hidden until it receives focus. */}
      <a
        href="#main-content"
        className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 ${FOCUS_RING}`}
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => setPlan(null)}
            className={`flex items-center gap-3 rounded-lg text-left ${FOCUS_RING}`}
          >
            <span
              aria-hidden
              className="rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-2.5 font-black text-slate-950"
            >
              ⚡
            </span>
            <span>
              <span className="block text-2xl leading-none tracking-tight">
                <span className="font-brush text-mist-gradient">Smog</span>
                <span className="font-blade font-black text-thunder-gradient">Slayer</span>
              </span>
              <span className="hidden text-xs text-slate-300 sm:block">
                Clean Air Action Dashboard
              </span>
            </span>
          </button>
          {plan && (
            <button
              type="button"
              onClick={() => setPlan(null)}
              className={`flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 ${FOCUS_RING}`}
            >
              <RefreshCw aria-hidden className="h-4 w-4" /> Edit inputs
            </button>
          )}
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 mx-auto max-w-4xl px-4 py-8 focus:outline-none sm:py-12"
      >
        <h1 className="sr-only">SmogSlayer: Urban Air Quality Assistant</h1>
        {plan ? (
          <PlanResults plan={plan} />
        ) : (
          <PlanForm initial={lastRequest} loading={loading} error={error} onSubmit={handleSubmit} />
        )}
      </main>
    </div>
  );
}

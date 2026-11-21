import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { fetchPlan, type Plan, type PlanRequest } from "@/lib/api";

import { PlanForm } from "./PlanForm";
import { PlanResults } from "./PlanResults";

export function SmogSlayerDashboard() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [lastRequest, setLastRequest] = useState<PlanRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button type="button" onClick={() => setPlan(null)} className="flex items-center gap-3 text-left">
            <span aria-hidden className="rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-2.5 font-black text-slate-950">⚡</span>
            <span>
              <span className="block text-2xl leading-none tracking-tight">
                <span className="font-brush text-mist-gradient">Smog</span>
                <span className="font-blade font-black text-thunder-gradient">Slayer</span>
              </span>
              <span className="hidden text-xs text-slate-300 sm:block">Clean Air Action Dashboard</span>
            </span>
          </button>
          {plan && (
            <button
              type="button"
              onClick={() => setPlan(null)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" /> Edit inputs
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:py-12">
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

import { ArrowRight, Bike, Bus, Car, Footprints, TrainFront } from "lucide-react";
import { useState } from "react";

import type { PlanRequest } from "@/lib/api";

const COMMUTES = [
  { id: "motorbike", name: "Motorbike / Scooter", Icon: Bike },
  { id: "car", name: "Car", Icon: Car },
  { id: "bus", name: "Bus", Icon: Bus },
  { id: "metro", name: "Metro / Train", Icon: TrainFront },
  { id: "walk_or_cycle", name: "Walk / Cycle", Icon: Footprints },
] as const;

const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "hi", name: "Hindi (हिंदी)" },
  { id: "hinglish", name: "Hinglish" },
] as const;

const DEFAULT_REQUEST: PlanRequest = {
  city: "",
  commute_mode: "motorbike",
  one_way_km: 10,
  sensitive_group: false,
  has_purifier: false,
  language: "en",
};

const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-300";
const fieldClass =
  "w-full rounded-2xl border border-slate-700/80 bg-slate-950/80 px-5 py-4 font-semibold text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30";
const checkClass =
  "flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-sm font-medium text-slate-200 hover:border-slate-700";

type Props = {
  initial: PlanRequest | null;
  loading: boolean;
  error: string;
  onSubmit: (request: PlanRequest) => void;
};

export function PlanForm({ initial, loading, error, onSubmit }: Props) {
  const [form, setForm] = useState<PlanRequest>(initial ?? DEFAULT_REQUEST);
  const update = <K extends keyof PlanRequest>(key: K, value: PlanRequest[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
          Beat the smog,{" "}
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">one habit</span>{" "}
          at a time.
        </h2>
        <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
          Enter your city to see today's air quality, the best hours to step outside, and low-emission routines for your family.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ ...form, city: form.city.trim() });
        }}
        className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-2xl sm:p-10"
      >
        <div className="space-y-2">
          <label htmlFor="city" className={labelClass}>City name</label>
          <input
            id="city"
            required
            minLength={2}
            maxLength={60}
            autoComplete="address-level2"
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
            placeholder="e.g. Delhi, Mumbai, Beijing"
            className={fieldClass}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className={labelClass}>How do you usually commute?</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COMMUTES.map(({ id, name, Icon }) => {
              const selected = form.commute_mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update("commute_mode", id)}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-cyan-500/80 bg-slate-800 ring-2 ring-cyan-500/30"
                      : "border-slate-800/80 bg-slate-950/50 hover:border-slate-700"
                  }`}
                >
                  <Icon className={`mb-2 h-5 w-5 ${selected ? "text-cyan-400" : "text-slate-400"}`} />
                  <span className={`text-sm font-bold ${selected ? "text-white" : "text-slate-300"}`}>{name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="km" className={labelClass}>One-way distance</label>
            <output htmlFor="km" className="rounded-lg border border-cyan-800/50 bg-cyan-950/60 px-3 py-1 font-mono font-bold text-cyan-300">
              {form.one_way_km} km
            </output>
          </div>
          <input
            id="km"
            type="range"
            min={1}
            max={50}
            value={form.one_way_km}
            onChange={(event) => update("one_way_km", Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-cyan-400"
          />
        </div>

        <div className="space-y-3">
          <label className={checkClass}>
            <input
              type="checkbox"
              checked={form.sensitive_group}
              onChange={(event) => update("sensitive_group", event.target.checked)}
              className="h-5 w-5 accent-cyan-500"
            />
            Children, older adults or someone with asthma at home
          </label>
          <label className={checkClass}>
            <input
              type="checkbox"
              checked={form.has_purifier}
              onChange={(event) => update("has_purifier", event.target.checked)}
              className="h-5 w-5 accent-cyan-500"
            />
            I have an air purifier at home
          </label>
        </div>

        <div className="space-y-2">
          <label htmlFor="language" className={labelClass}>Language for the tips</label>
          <select
            id="language"
            value={form.language}
            onChange={(event) => update("language", event.target.value as PlanRequest["language"])}
            className={`${fieldClass} cursor-pointer py-3.5`}
          >
            {LANGUAGES.map(({ id, name }) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-6 py-4 text-lg font-black text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:shadow-cyan-500/40 disabled:opacity-50"
        >
          {loading ? "Checking the air…" : <>Get my action plan <ArrowRight className="h-5 w-5" /></>}
        </button>
      </form>
    </div>
  );
}

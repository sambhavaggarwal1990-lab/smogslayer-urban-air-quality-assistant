import { Flame } from "lucide-react";
import { useState } from "react";

import { completeToday, currentStreak } from "@/lib/streak";
import { CARD_CLASS } from "../styles";

/** Today's low-emission routine as a checklist. Ticking every item extends the streak. */
export function RoutinePledge({ tips }: { tips: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => tips.map(() => false));
  const [streak, setStreak] = useState(currentStreak); // read once from localStorage when the card appears

  function toggle(index: number) {
    const next = checked.map((value, i) => (i === index ? !value : value));
    setChecked(next);
    setStreak(next.every(Boolean) ? completeToday() : currentStreak()); // only a fully ticked list counts as a day
  }

  return (
    <section className={CARD_CLASS}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Today's low-emission routine</h2>
          <p className="text-xs text-slate-300">
            Tick every action to extend your clean-air streak
          </p>
        </div>
        {/* aria-live announces the new streak to screen readers when it changes. */}
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

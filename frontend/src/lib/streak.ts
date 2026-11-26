/**
 * The daily "clean-air routine" streak.
 *
 * It is kept in this browser's localStorage only: nothing is sent to a server.
 * A streak survives a missed-free run of days; skipping a whole day resets it.
 */

const STORAGE_KEY = "smogslayer-streak";

type Streak = { last: string; days: number }; // `last` is the date of the last completed day, as YYYY-MM-DD

/** Local date as YYYY-MM-DD ("en-CA" happens to use that format), `daysAgo` days back from today. */
const day = (daysAgo = 0): string =>
  new Date(Date.now() - daysAgo * 864e5).toLocaleDateString("en-CA");

/** Read the saved streak. Missing, unreadable or blocked storage all count as "no streak yet". */
function load(): Streak {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "") as Streak;
  } catch {
    return { last: "", days: 0 };
  }
}

/** Days in the current streak: it only counts if the last completed day was today or yesterday. */
export function currentStreak(): number {
  const { last, days } = load();
  return last === day() || last === day(1) ? days : 0;
}

/** Record that today's routine is done and return the new streak length. Safe to call twice in a day. */
export function completeToday(): number {
  const { last, days } = load();
  if (last === day()) return days; // already counted today

  const next = last === day(1) ? days + 1 : 1; // continue yesterday's streak, otherwise start again
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ last: day(), days: next }));
  } catch {
    // Storage can be blocked (private mode, full disk). The streak just won't be saved.
  }
  return next;
}

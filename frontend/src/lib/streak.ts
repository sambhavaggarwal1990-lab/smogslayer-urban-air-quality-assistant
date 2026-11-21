// The streak lives in this browser only; nothing is sent to the server.
const KEY = "smogslayer-streak";
type Streak = { last: string; days: number };

const day = (daysAgo = 0) => new Date(Date.now() - daysAgo * 864e5).toLocaleDateString("en-CA");

function load(): Streak {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "") as Streak;
  } catch {
    return { last: "", days: 0 };
  }
}

export function currentStreak(): number {
  const { last, days } = load();
  return last === day() || last === day(1) ? days : 0;
}

export function completeToday(): number {
  const { last, days } = load();
  if (last === day()) return days;
  const next = last === day(1) ? days + 1 : 1;
  try {
    localStorage.setItem(KEY, JSON.stringify({ last: day(), days: next }));
  } catch {
    /* storage unavailable: the streak simply won't be saved */
  }
  return next;
}

// Mist Breathing intro choreography (seconds from page open).
export const TIMELINE = {
  fillStart: 0.6,
  fillEnd: 4.0,
  strike: 4.25,
  clearStart: 4.35,
  clearEnd: 8.4,
  katana: 4.3,
  title: 5.7,
  loadStart: 7.3,
  loadEnd: 10.5,
  exit: 10.8,
  done: 11.7,
} as const;

export type Stage = "dark" | "smog" | "strike" | "katana" | "title" | "loading" | "exit" | "done";

/** Stepped leader creeping down from the cloud before the first return stroke. */
export const LEADER = { start: 4.06, end: TIMELINE.strike } as const;

/** Return strokes: real lightning re-flashes down the same channel several times. */
export const RETURN_STROKES = [
  { t: TIMELINE.strike, i: 1 },
  { t: 4.38, i: 0.55 },
  { t: 4.52, i: 0.9 },
  { t: 4.64, i: 0.4 },
] as const;

/** Sky flashes that light up the smog (in-cloud flicker + every return stroke). */
export const FLASHES = [{ t: 4.0, flash: 0.25 }, ...RETURN_STROKES.map((s) => ({ t: s.t, flash: s.i }))] as const;

export function stageAt(t: number): Stage {
  const T = TIMELINE;
  if (t >= T.done) return "done";
  if (t >= T.exit) return "exit";
  if (t >= T.loadStart) return "loading";
  if (t >= T.title) return "title";
  if (t >= T.katana) return "katana";
  if (t >= 3.95) return "strike";
  if (t >= T.fillStart) return "smog";
  return "dark";
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeInOut = (x: number) => x * x * (3 - 2 * x);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** Smog coverage and clearing at time t. Fill never drops once full: smog stays on screen. */
export function smogAt(t: number) {
  return {
    fill: easeInOut(range(t, TIMELINE.fillStart, TIMELINE.fillEnd)),
    clear: easeOut(range(t, TIMELINE.clearStart, TIMELINE.clearEnd)),
  };
}

/** Ground crack growth: ruptures on the first stroke, splits further on the big re-strike. */
export function crackAt(t: number) {
  const second = RETURN_STROKES[2].t;
  return 0.62 * easeOut(range(t, TIMELINE.strike, TIMELINE.strike + 0.22)) + 0.38 * easeOut(range(t, second, second + 0.4));
}

/** Heat glowing inside the crack: white-hot at the strike, cooling to smouldering embers. */
export function heatAt(t: number) {
  if (t < TIMELINE.strike) return 0;
  return 0.5 + 0.5 * Math.exp(-(t - TIMELINE.strike) * 0.9);
}

export function loadProgressAt(t: number) {
  return easeInOut(range(t, TIMELINE.loadStart, TIMELINE.loadEnd));
}

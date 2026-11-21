// Shared layout of the strike scene (fractions of the viewport, y measured from the top).
export const SCENE = {
  /** Where the lightning hits the ground and the katana is stuck. */
  impactY: 0.76,
  /** Ground horizon. */
  horizonY: 0.52,
  /** World size (ground units) covered by the crack texture. */
  crackWorld: 5,
  katana: {
    /** Full katana length if it were not buried (vh). */
    totalVh: 70,
    /** Part of the sword above the ground (rest is buried in the crack). */
    visibleFrac: 0.82,
    widthVh: 13,
    /** Resting lean of the stuck sword. Negative = handle leans left. */
    tiltDeg: -4,
    /** Where the blade meets the collar, as a fraction of the visible height from the top. */
    habakiFrac: 0.439,
  },
} as const;

export const KATANA_VISIBLE_VH = SCENE.katana.totalVh * SCENE.katana.visibleFrac;

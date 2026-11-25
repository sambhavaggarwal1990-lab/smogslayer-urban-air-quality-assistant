import { describe, expect, it } from "vitest";

import {
  LEADER,
  RETURN_STROKES,
  TIMELINE,
  crackAt,
  heatAt,
  loadProgressAt,
  smogAt,
  stageAt,
} from "./intro-timeline";

describe("Mist Breathing intro order", () => {
  it("opens on a black screen with no smog", () => {
    expect(stageAt(0.1)).toBe("dark");
    expect(smogAt(0.1).fill).toBe(0);
  });

  it("fills the screen with smog before the lightning strikes", () => {
    expect(smogAt(TIMELINE.strike).fill).toBe(1);
    expect(smogAt(TIMELINE.strike).clear).toBe(0);
  });

  it("lightning creeps down first, then strikes", () => {
    expect(LEADER.end).toBe(TIMELINE.strike);
    expect(LEADER.start).toBeLessThan(TIMELINE.strike);
    expect(RETURN_STROKES[0].t).toBe(TIMELINE.strike);
  });

  it("the ground cracks only after the strike and stays cracked", () => {
    expect(crackAt(TIMELINE.strike - 0.01)).toBe(0);
    expect(heatAt(TIMELINE.strike - 0.01)).toBe(0);
    expect(crackAt(TIMELINE.done)).toBeCloseTo(1);
    expect(heatAt(TIMELINE.done)).toBeGreaterThan(0.3);
  });

  it("the stuck katana appears after the strike, then the title, then loading", () => {
    expect(TIMELINE.katana).toBeGreaterThan(TIMELINE.strike);
    expect(TIMELINE.katana).toBeLessThan(TIMELINE.title);
    expect(TIMELINE.title).toBeLessThan(TIMELINE.loadStart);
    expect(loadProgressAt(TIMELINE.title)).toBe(0);
    expect(loadProgressAt(TIMELINE.loadEnd)).toBe(1);
  });

  it("keeps the smog on screen for the whole intro", () => {
    for (let t = TIMELINE.fillEnd; t <= TIMELINE.done; t += 0.25) {
      expect(smogAt(t).fill).toBe(1);
    }
  });
});

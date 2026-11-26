import { afterEach, describe, expect, it, vi } from "vitest";

import { prefersReducedMotion } from "./reduced-motion";

describe("prefersReducedMotion", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is false by default", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("is true when the system asks for less motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
  });
});

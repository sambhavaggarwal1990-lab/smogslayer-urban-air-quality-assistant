import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { completeToday, currentStreak } from "./streak";

describe("streak", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00")); // a fixed "today" so the tests never depend on the real date
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts at zero", () => {
    expect(currentStreak()).toBe(0);
  });

  it("counts the first completed day as 1", () => {
    expect(completeToday()).toBe(1);
    expect(currentStreak()).toBe(1);
  });

  it("does not count the same day twice", () => {
    completeToday();
    expect(completeToday()).toBe(1);
  });

  it("continues the streak on the next day", () => {
    completeToday();
    vi.setSystemTime(new Date("2026-11-21T09:00:00"));
    expect(currentStreak()).toBe(1); // yesterday still counts
    expect(completeToday()).toBe(2);
  });

  it("resets after a missed day", () => {
    completeToday();
    vi.setSystemTime(new Date("2026-11-23T09:00:00"));
    expect(currentStreak()).toBe(0);
    expect(completeToday()).toBe(1);
  });

  it("treats unreadable saved data as no streak", () => {
    localStorage.setItem("smogslayer-streak", "not json");
    expect(currentStreak()).toBe(0);
  });

  it("still returns a streak when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(completeToday()).toBe(1);
  });
});

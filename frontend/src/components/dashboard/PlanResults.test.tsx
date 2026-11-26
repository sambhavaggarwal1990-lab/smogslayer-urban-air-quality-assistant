import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Plan } from "@/lib/api";
import { PLAN } from "@/test/fixtures";
import { PlanResults } from "./PlanResults";

const show = (plan: Plan = PLAN) => render(<PlanResults plan={plan} />);

describe("PlanResults", () => {
  beforeEach(() => localStorage.clear());

  it("shows the AQI, its category and PM2.5", () => {
    show();
    expect(screen.getByText("229")).toBeTruthy();
    expect(screen.getByText("US AQI: Very unhealthy")).toBeTruthy();
    expect(screen.getByText(/148\.2/)).toBeTruthy();
    expect(screen.getByText(/Air in Delhi, India/)).toBeTruthy();
  });

  it("shows the safety alert only when there is one", () => {
    const { unmount } = show();
    expect(screen.getByRole("alert").textContent).toContain("Air is very unhealthy");
    unmount();
    show({ ...PLAN, alert: null });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says who wrote the tips", () => {
    const { unmount } = show();
    expect(screen.getByText("Tips written by Gemini")).toBeTruthy();
    unmount();
    show({ ...PLAN, advice: { ...PLAN.advice, source: "built-in" } });
    expect(screen.getByText("Built-in tips (AI unavailable right now)")).toBeTruthy();
  });

  it("shows the 24-hour outlook, or hides it when there is no forecast", () => {
    const { unmount } = show();
    expect(screen.getByText("The next 24 hours")).toBeTruthy();
    expect(screen.getByText(/Best time to be outside/)).toBeTruthy();
    unmount();
    show({ ...PLAN, outlook: null });
    expect(screen.queryByText("The next 24 hours")).toBeNull();
  });

  it("shows the commute emissions and what each switch saves", () => {
    show();
    expect(screen.getByText(/52\.8 kg CO₂ a month/)).toBeTruthy();
    expect(screen.getByText("Switch to metro")).toBeTruthy();
    expect(screen.getByText("saves 31.7 kg / month")).toBeTruthy();
  });

  it("congratulates users who already take the cleanest option", () => {
    show({ ...PLAN, impact: { mode: "walk_or_cycle", monthly_co2_kg: 0, switches: [] } });
    expect(screen.getByText("You already use the cleanest option.")).toBeTruthy();
  });

  it("lists the tips", () => {
    show();
    expect(screen.getByLabelText("Avoid outdoor exercise")).toBeTruthy();
    expect(screen.getByText("Keep windows shut near rush hour")).toBeTruthy();
    expect(screen.getByText("Take the metro instead of the motorbike")).toBeTruthy();
  });

  it("only counts a day when every routine item is ticked", () => {
    show();
    const boxes = PLAN.advice.routine.map((tip) => screen.getByLabelText(tip));
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    expect(screen.getByText(/Streak: 0 day/)).toBeTruthy();
    fireEvent.click(boxes[2]!);
    expect(screen.getByText(/Streak: 1 day/)).toBeTruthy();
  });

  it("moves focus to the results when they appear", () => {
    show();
    expect(document.activeElement).toBe(
      screen.getByRole("region", { name: "Your air quality plan" }),
    );
  });

  it("copies a summary to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    expect(await screen.findByText("Copied!")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("AQI 229"));
  });
});

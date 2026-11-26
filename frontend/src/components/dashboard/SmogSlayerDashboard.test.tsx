import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PLAN, errorResponse, okResponse } from "@/test/fixtures";
import { SmogSlayerDashboard } from "./SmogSlayerDashboard";

/** Type a city and press the main button. */
function askForPlan(city: string) {
  fireEvent.change(screen.getByLabelText("City name"), { target: { value: city } });
  fireEvent.click(screen.getByRole("button", { name: /Get my action plan/ }));
}

describe("SmogSlayerDashboard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("starts on the form", () => {
    render(<SmogSlayerDashboard />);
    expect(screen.getByLabelText("City name")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Your air quality plan" })).toBeNull();
  });

  it("fetches the plan with what was typed and shows it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(PLAN));
    vi.stubGlobal("fetch", fetchMock);
    render(<SmogSlayerDashboard />);
    askForPlan("Delhi");

    expect(await screen.findByText("229")).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({
      city: "Delhi",
      commute_mode: "motorbike",
    });
  });

  it("keeps the form and shows the reason when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(400, { error: "We couldn't find that city." })),
    );
    render(<SmogSlayerDashboard />);
    askForPlan("Zzzz");

    expect((await screen.findByRole("alert")).textContent).toBe("We couldn't find that city.");
    expect(screen.getByLabelText("City name")).toBeTruthy();
  });

  it("brings back the typed values when the user edits the inputs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(PLAN)));
    render(<SmogSlayerDashboard />);
    askForPlan("Delhi");
    await screen.findByText("229");

    fireEvent.click(screen.getByRole("button", { name: /Edit inputs/ }));
    expect((screen.getByLabelText("City name") as HTMLInputElement).value).toBe("Delhi");
  });

  it("offers a skip link for keyboard users", () => {
    render(<SmogSlayerDashboard />);
    expect(screen.getByText("Skip to main content").getAttribute("href")).toBe("#main-content");
  });
});

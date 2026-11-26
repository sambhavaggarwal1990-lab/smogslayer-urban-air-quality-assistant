import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlanRequest } from "@/lib/api";
import { PlanForm } from "./PlanForm";

/** Render the form with sensible defaults; returns the mock that receives the submitted values. */
function setup(props: Partial<Parameters<typeof PlanForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(<PlanForm initial={null} loading={false} error="" onSubmit={onSubmit} {...props} />);
  return { onSubmit };
}

const submitButton = () =>
  screen.getByRole("button", { name: /Get my action plan|Checking the air/ }) as HTMLButtonElement;

describe("PlanForm", () => {
  it("sends the filled-in form with the city trimmed", () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText("City name"), { target: { value: "  Mumbai " } });
    fireEvent.click(screen.getByRole("button", { name: /Metro/ }));
    fireEvent.change(screen.getByLabelText("One-way distance"), { target: { value: "16" } });
    fireEvent.click(screen.getByLabelText(/children, older adults/i));
    fireEvent.change(screen.getByLabelText("Language for the tips"), {
      target: { value: "hinglish" },
    });
    fireEvent.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith({
      city: "Mumbai",
      commute_mode: "metro",
      one_way_km: 16,
      sensitive_group: true,
      has_purifier: false,
      language: "hinglish",
    });
  });

  it("starts with the motorbike selected and lets the user change it", () => {
    setup();
    const motorbike = screen.getByRole("button", { name: /Motorbike/ });
    const car = screen.getByRole("button", { name: /^Car$/ });
    expect(motorbike.getAttribute("aria-pressed")).toBe("true");
    expect(car.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(car);
    expect(car.getAttribute("aria-pressed")).toBe("true");
    expect(motorbike.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows the distance next to the slider", () => {
    setup();
    fireEvent.change(screen.getByLabelText("One-way distance"), { target: { value: "25" } });
    expect(screen.getByText("25 km")).toBeTruthy();
  });

  it("starts from the values it was given", () => {
    const initial: PlanRequest = {
      city: "Pune",
      commute_mode: "bus",
      one_way_km: 7,
      sensitive_group: true,
      has_purifier: true,
      language: "hi",
    };
    setup({ initial });
    expect((screen.getByLabelText("City name") as HTMLInputElement).value).toBe("Pune");
    expect((screen.getByLabelText("Language for the tips") as HTMLSelectElement).value).toBe("hi");
    expect(screen.getByRole("button", { name: /Bus/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("announces an error", () => {
    setup({ error: "We couldn't find that city." });
    expect(screen.getByRole("alert").textContent).toBe("We couldn't find that city.");
  });

  it("shows no error when there is none", () => {
    setup();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("disables the button and says so while loading", () => {
    setup({ loading: true });
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain("Checking the air");
    expect(screen.getAllByText(/checking the air/i)[0]?.textContent).toBe("Checking the air…");
  });
});

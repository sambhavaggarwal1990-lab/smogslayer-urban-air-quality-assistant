import { afterEach, describe, expect, it, vi } from "vitest";

import { apiUrlFor, fetchPlan, type PlanRequest } from "./api";
import { PLAN, errorResponse, okResponse } from "@/test/fixtures";

const REQUEST: PlanRequest = {
  city: "Delhi",
  commute_mode: "car",
  one_way_km: 10,
  sensitive_group: false,
  has_purifier: false,
  language: "en",
};

describe("apiUrlFor", () => {
  it("uses the local backend on localhost", () => {
    expect(apiUrlFor("localhost")).toBe("http://127.0.0.1:5001");
    expect(apiUrlFor("127.0.0.1")).toBe("http://127.0.0.1:5001");
  });

  it("uses the hosted backend on any other address", () => {
    expect(apiUrlFor("smogslayer.lovable.app")).toBe("https://smogslayer-api.onrender.com");
  });

  it("lets an explicit setting win", () => {
    expect(apiUrlFor("localhost", "https://example.test")).toBe("https://example.test");
  });
});

describe("fetchPlan", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the request as JSON and returns the plan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(PLAN));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPlan(REQUEST)).resolves.toEqual(PLAN);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/plan$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(REQUEST);
  });

  it("shows the backend's own message when it refuses the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(400, { error: "We couldn't find that city." })),
    );
    await expect(fetchPlan(REQUEST)).rejects.toThrow("We couldn't find that city.");
  });

  it("uses a generic message when the error body is not usable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 502,
          json: () => Promise.reject(new Error("not json")),
        }),
    );
    await expect(fetchPlan(REQUEST)).rejects.toThrow("Something went wrong");
  });

  it("explains when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchPlan(REQUEST)).rejects.toThrow("Can't reach the SmogSlayer server");
  });
});

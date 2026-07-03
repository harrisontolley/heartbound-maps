import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capturePostHogServerEvent, isPostHogServerConfigured } from "./posthog.js";

// Server-side PostHog capture. Env-guarded like resend/artelo: unconfigured or
// any failure must resolve without throwing. These tests stub fetch (no
// network) and restore process.env after each case.

function okResponse(status: number) {
  return { ok: status >= 200 && status < 300, status } as Response;
}

const originalKey = process.env.POSTHOG_PROJECT_API_KEY;
const originalHost = process.env.POSTHOG_HOST;

beforeEach(() => {
  delete process.env.POSTHOG_PROJECT_API_KEY;
  delete process.env.POSTHOG_HOST;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.POSTHOG_PROJECT_API_KEY;
  else process.env.POSTHOG_PROJECT_API_KEY = originalKey;
  if (originalHost === undefined) delete process.env.POSTHOG_HOST;
  else process.env.POSTHOG_HOST = originalHost;
});

describe("isPostHogServerConfigured", () => {
  it("is false unless POSTHOG_PROJECT_API_KEY is set", () => {
    expect(isPostHogServerConfigured()).toBe(false);
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    expect(isPostHogServerConfigured()).toBe(true);
  });
});

describe("capturePostHogServerEvent", () => {
  it("never fetches when unconfigured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await capturePostHogServerEvent("order_fulfilled", "ord-1", { is_test_order: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to PostHog's capture endpoint with the configured key", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    const fetchMock = vi.fn().mockResolvedValue(okResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    await capturePostHogServerEvent("order_fulfilled", "ord-1", { is_test_order: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("https://us.i.posthog.com/capture/");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      api_key: "phc_test",
      event: "order_fulfilled",
      distinct_id: "ord-1",
      properties: { is_test_order: true, $process_person_profile: false },
    });
  });

  it("respects a custom POSTHOG_HOST", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com/";
    const fetchMock = vi.fn().mockResolvedValue(okResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    await capturePostHogServerEvent("checkout_completed", "ord-1");

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(String(url)).toBe("https://eu.i.posthog.com/capture/");
  });

  it("swallows a non-2xx response without throwing", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(500)));

    await expect(capturePostHogServerEvent("order_fulfilled", "ord-1")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("swallows a fetch throw without throwing", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(capturePostHogServerEvent("order_fulfilled", "ord-1")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

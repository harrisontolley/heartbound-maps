import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureError } from "./sentry.js";

// captureError mirrors every backend error into PostHog error tracking as a
// $exception event (alongside Sentry). Like all integration paths it must be
// env-guarded: no POSTHOG_PROJECT_API_KEY → no network call, and a capture
// failure must never surface to the caller.

const originalKey = process.env.POSTHOG_PROJECT_API_KEY;

beforeEach(() => {
  delete process.env.POSTHOG_PROJECT_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.POSTHOG_PROJECT_API_KEY;
  else process.env.POSTHOG_PROJECT_API_KEY = originalKey;
});

describe("captureError → PostHog mirror", () => {
  it("does nothing when PostHog is unconfigured", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    captureError(new Error("boom"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures a $exception event with the error's name and message", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    captureError(new TypeError("bad input"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.event).toBe("$exception");
    expect(body.distinct_id).toBe("backend");
    expect(body.properties.source).toBe("backend");
    expect(body.properties.$exception_list).toEqual([
      {
        type: "TypeError",
        value: "bad input",
        mechanism: { handled: true, synthetic: false },
      },
    ]);
  });

  it("wraps non-Error throwables and marks them synthetic", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    captureError("string failure");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.properties.$exception_list[0]).toMatchObject({
      value: "string failure",
      mechanism: { handled: true, synthetic: true },
    });
  });

  it("never throws when the capture request fails", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    expect(() => captureError(new Error("boom"))).not.toThrow();
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });
});

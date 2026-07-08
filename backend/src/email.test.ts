import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isResendConfigured, sendEmail } from "./email.js";

// Resend transactional email. Env-guarded like artelo/nominatim: unconfigured
// or any failure must resolve null, never throw. These tests stub fetch (no
// network) and restore process.env after each case.

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = originalFrom;
});

describe("isResendConfigured", () => {
  it("is false unless both RESEND_API_KEY and EMAIL_FROM are set", () => {
    expect(isResendConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "re_test";
    expect(isResendConfigured()).toBe(false);

    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = "Heartbound Maps <hello@example.com>";
    expect(isResendConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "re_test";
    expect(isResendConfigured()).toBe(true);
  });
});

describe("sendEmail", () => {
  it("resolves null without throwing when unconfigured", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendEmail({ to: "a@example.com", subject: "s", html: "<p>h</p>", text: "t" });
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("posts to Resend and returns the id on a 200", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Heartbound Maps <hello@example.com>";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "email_123" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "a@example.com", subject: "Hi", html: "<p>hi</p>", text: "hi" });

    expect(result).toEqual({ id: "email_123" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Heartbound Maps <hello@example.com>",
      to: ["a@example.com"],
      subject: "Hi",
      html: "<p>hi</p>",
      text: "hi",
    });
  });

  it("returns null on a non-2xx response", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Heartbound Maps <hello@example.com>";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(422, { message: "invalid" })));

    const result = await sendEmail({ to: "a@example.com", subject: "s", html: "h", text: "t" });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns null when fetch throws", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Heartbound Maps <hello@example.com>";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await sendEmail({ to: "a@example.com", subject: "s", html: "h", text: "t" });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns null when the response JSON has no id", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Heartbound Maps <hello@example.com>";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, {})));

    const result = await sendEmail({ to: "a@example.com", subject: "s", html: "h", text: "t" });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

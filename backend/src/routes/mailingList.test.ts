import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { __resetRateLimits } from "../rateLimit.js";

// Mirrors routes/leads.test.ts's approach: DB/email collaborators stubbed,
// route exercised over real HTTP via app.request.

const upsertMailingListSubscriber = vi.fn();
const markMailingListConfirmationSent = vi.fn();
vi.mock("../mailingListStore.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../mailingListStore.js")>();
  return {
    ...actual,
    upsertMailingListSubscriber: (...args: unknown[]) => upsertMailingListSubscriber(...args),
    markMailingListConfirmationSent: (...args: unknown[]) => markMailingListConfirmationSent(...args),
  };
});

const getSql = vi.fn();
vi.mock("../db.js", () => ({ getSql: (...args: unknown[]) => getSql(...args) }));

const isResendConfigured = vi.fn();
const sendEmail = vi.fn();
vi.mock("../email.js", () => ({
  isResendConfigured: (...args: unknown[]) => isResendConfigured(...args),
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

function signupBody(overrides: Record<string, unknown> = {}) {
  return { email: "buyer@example.com", reasons: ["size"], ...overrides };
}

function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetRateLimits();
  vi.clearAllMocks();
  getSql.mockReturnValue({});
  isResendConfigured.mockReturnValue(false);
  upsertMailingListSubscriber.mockResolvedValue({ id: "sub-1", existing: false });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /mailing-list — env guard", () => {
  it("503s when the DB is unconfigured", async () => {
    getSql.mockReturnValue(null);
    const res = await post("/mailing-list", signupBody());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "mailing_list_unconfigured" });
    expect(upsertMailingListSubscriber).not.toHaveBeenCalled();
  });
});

describe("POST /mailing-list — validation", () => {
  it("400s on a missing/invalid email", async () => {
    const res = await post("/mailing-list", signupBody({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(upsertMailingListSubscriber).not.toHaveBeenCalled();
  });

  it("400s on an unknown reason", async () => {
    const res = await post("/mailing-list", signupBody({ reasons: ["size", "bogus"] }));
    expect(res.status).toBe(400);
  });

  it("400s on oversized otherText", async () => {
    const res = await post(
      "/mailing-list",
      signupBody({ reasons: ["other"], otherText: "x".repeat(501) }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts an empty reasons array (email-only signup)", async () => {
    const res = await post("/mailing-list", { email: "buyer@example.com" });
    expect(res.status).toBe(202);
    expect(upsertMailingListSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com", reasons: [] }),
    );
  });
});

describe("POST /mailing-list — success", () => {
  it("saves the subscriber and returns 202 without an email confirmation configured", async () => {
    const res = await post("/mailing-list", signupBody());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ status: "subscribed" });
    expect(upsertMailingListSubscriber).toHaveBeenCalledWith({
      email: "buyer@example.com",
      reasons: ["size"],
      otherText: null,
      source: null,
      consent: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("dedupes reasons and drops otherText when 'other' isn't selected", async () => {
    await post(
      "/mailing-list",
      signupBody({ reasons: ["size", "size", "material"], otherText: "ignored" }),
    );
    expect(upsertMailingListSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ reasons: ["size", "material"], otherText: null }),
    );
  });

  it("sends a best-effort confirmation when Resend is configured, and marks it sent", async () => {
    isResendConfigured.mockReturnValue(true);
    sendEmail.mockResolvedValue({ id: "email_123" });
    const res = await post("/mailing-list", signupBody());
    expect(res.status).toBe(202);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "buyer@example.com" }));
    expect(markMailingListConfirmationSent).toHaveBeenCalledWith("sub-1");
  });

  it("still 202s when the confirmation email fails to send", async () => {
    isResendConfigured.mockReturnValue(true);
    sendEmail.mockResolvedValue(null);
    const res = await post("/mailing-list", signupBody());
    expect(res.status).toBe(202);
    expect(markMailingListConfirmationSent).not.toHaveBeenCalled();
  });

  it("503s when the store drops out between the guard check and the write", async () => {
    upsertMailingListSubscriber.mockResolvedValue(null);
    const res = await post("/mailing-list", signupBody());
    expect(res.status).toBe(503);
  });
});

describe("POST /mailing-list — rate limiting", () => {
  it("429s after the per-window cap", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await post("/mailing-list", signupBody());
      expect(res.status).toBe(202);
    }
    const res = await post("/mailing-list", signupBody());
    expect(res.status).toBe(429);
  });
});

import type { Context } from "hono";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimits, clientKey, enforce, rateLimit } from "./rateLimit.js";

// Hermetic: with Upstash unset, enforce() takes the in-memory fallback path — no
// network. Verifies the fallback enforces the limit and that clientKey prefers the
// non-spoofable x-real-ip.

beforeAll(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

beforeEach(() => {
  __resetRateLimits();
});

afterEach(() => {
  __resetRateLimits();
});

const fakeCtx = (headers: Record<string, string> = {}): Context =>
  ({
    req: { header: (k: string) => headers[k.toLowerCase()] },
  }) as unknown as Context;

describe("enforce (in-memory fallback)", () => {
  it("allows up to max, then limits", async () => {
    const c = fakeCtx();
    const opts = { max: 3, windowMs: 60_000 };
    expect(await enforce(c, "x", opts)).toBe(false);
    expect(await enforce(c, "x", opts)).toBe(false);
    expect(await enforce(c, "x", opts)).toBe(false);
    expect(await enforce(c, "x", opts)).toBe(true);
  });

  it("keeps separate budgets per name", async () => {
    const c = fakeCtx();
    const opts = { max: 1, windowMs: 60_000 };
    expect(await enforce(c, "a", opts)).toBe(false);
    expect(await enforce(c, "b", opts)).toBe(false); // different name → own bucket
    expect(await enforce(c, "a", opts)).toBe(true);
  });
});

describe("clientKey", () => {
  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(
      clientKey(fakeCtx({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
    ).toBe("9.9.9.9");
  });

  it("falls back to the leftmost x-forwarded-for, then unknown", () => {
    expect(clientKey(fakeCtx({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientKey(fakeCtx())).toBe("unknown");
  });
});

describe("rateLimit (raw fallback)", () => {
  it("counts within a fixed window", () => {
    const now = 1_000;
    expect(rateLimit("y", "k", { max: 2, windowMs: 1000 }, now)).toBe(false);
    expect(rateLimit("y", "k", { max: 2, windowMs: 1000 }, now)).toBe(false);
    expect(rateLimit("y", "k", { max: 2, windowMs: 1000 }, now)).toBe(true);
  });
});

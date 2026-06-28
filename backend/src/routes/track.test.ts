import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { __resetTrackRateLimit } from "./track.js";

// Hermetic: no DATABASE_URL, so order lookups return null and /track returns a
// generic 404 (the same response a wrong email gets — no enumeration signal).
// Ensure Upstash is unset so enforce() uses the deterministic in-memory fallback
// even on a machine whose shell exported the keys.

beforeAll(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

beforeEach(() => {
  __resetTrackRateLimit();
});

describe("public /track", () => {
  for (const base of ["", "/_/backend"]) {
    it(`unknown order → 404 not_found (${base || "/"})`, async () => {
      const res = await app.request(`${base}/track`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber: "PP-NOPE0", email: "x@y.com" }),
      });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "not_found" });
    });

    it(`missing fields → 404 (${base || "/"})`, async () => {
      const res = await app.request(`${base}/track`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });

    it(`GET form works (${base || "/"})`, async () => {
      const res = await app.request(`${base}/track?number=PP-NOPE0&email=x@y.com`);
      expect(res.status).toBe(404);
    });
  }

  it("rate-limits after the window allowance", async () => {
    let sawLimit = false;
    for (let i = 0; i < 40; i += 1) {
      const res = await app.request("/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber: "PP-NOPE0", email: "x@y.com" }),
      });
      if (res.status === 429) {
        sawLimit = true;
        break;
      }
    }
    expect(sawLimit).toBe(true);
  });
});

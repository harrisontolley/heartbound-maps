import { describe, expect, it } from "vitest";
import { app } from "./app.js";

// These exercise routing and validation only — no network/DB. The Nominatim
// proxy itself is covered by short-circuit cases (empty/short queries).

describe("pinprint-api", () => {
  it("GET /health → ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("GET /health/db → ok:false without DATABASE_URL", async () => {
    const res = await app.request("/health/db");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("GET /geocode/search with too-short query → []", async () => {
    const res = await app.request("/geocode/search?q=a");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("GET /geocode/reverse with bad params → 400", async () => {
    const res = await app.request("/geocode/reverse?lat=foo");
    expect(res.status).toBe(400);
  });

  it("serves the same routes under the /_/backend service prefix", async () => {
    const res = await app.request("/_/backend/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

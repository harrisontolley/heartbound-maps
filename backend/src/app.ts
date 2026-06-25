import { Hono } from "hono";
import { cors } from "hono/cors";
import { geocodeReverse, geocodeSearch } from "./nominatim.js";
import { pingDb } from "./db.js";

// The Pinprint API. Owns the Nominatim geocoding proxy (User-Agent, rate gate,
// LRU cache live in ./nominatim) and the Neon connectivity check. The frontend
// reaches these routes through a Next.js rewrite, so same-origin in production;
// CORS is enabled for direct/local cross-origin calls.

export const app = new Hono();

app.use("*", cors());

app.get("/", (c) => c.json({ name: "pinprint-api", ok: true }));

app.get("/health", (c) => c.json({ ok: true }));

app.get("/health/db", async (c) => c.json({ ok: await pingDb() }));

app.get("/geocode/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json([]);
  try {
    const results = await geocodeSearch(q);
    c.header("Cache-Control", "public, max-age=86400");
    return c.json(results);
  } catch {
    return c.json({ error: "geocode_failed" }, 502);
  }
});

app.get("/geocode/reverse", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lon") ?? c.req.query("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return c.json({ error: "bad_params" }, 400);
  }
  try {
    const result = await geocodeReverse(lat, lng);
    c.header("Cache-Control", "public, max-age=86400");
    return c.json(result);
  } catch {
    return c.json({ error: "geocode_failed" }, 502);
  }
});

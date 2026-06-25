import { Hono } from "hono";
import { cors } from "hono/cors";
import { geocodeReverse, geocodeSearch } from "./nominatim.js";
import { pingDb } from "./db.js";

// The Pinprint API. Owns the Nominatim geocoding proxy (User-Agent, rate gate,
// LRU cache live in ./nominatim) and the Neon connectivity check.
//
// Deployed as a Vercel "service" mounted at routePrefix "/_/backend". Vercel
// does NOT strip that prefix before the request reaches us, so the same routes
// are registered at both "/" (local dev, where the client hits the origin
// directly) and "/_/backend" (production). CORS is enabled for the local
// cross-origin case; in production the client is same-origin.

/** Mount prefix for the backend service in production (see root vercel.json). */
export const SERVICE_PREFIX = "/_/backend";

function registerRoutes(r: Hono): Hono {
  r.get("/", (c) => c.json({ name: "pinprint-api", ok: true }));

  r.get("/health", (c) => c.json({ ok: true }));

  r.get("/health/db", async (c) => c.json({ ok: await pingDb() }));

  r.get("/geocode/search", async (c) => {
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

  r.get("/geocode/reverse", async (c) => {
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

  return r;
}

export const app = new Hono();
app.use("*", cors());
app.route("/", registerRoutes(new Hono()));
app.route(SERVICE_PREFIX, registerRoutes(new Hono()));

// Default export is what Vercel's Hono runtime wraps as the function handler.
export default app;

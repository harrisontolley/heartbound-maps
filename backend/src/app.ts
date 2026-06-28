import { Hono } from "hono";
import { cors } from "hono/cors";
import { geocodeReverse, geocodeSearch } from "./nominatim.js";
import { pingDb } from "./db.js";
import { constructWebhookEvent, isStripeConfigured } from "./stripe.js";
import { isProdigiConfigured } from "./prodigi.js";
import { isAuthConfigured } from "./auth.js";
import { handleProdigiPayload, handleStripeEvent } from "./webhooks.js";
import { buildAccountRouter } from "./routes/account.js";
import { buildTrackRouter } from "./routes/track.js";
import { buildCheckoutRouter } from "./routes/checkout.js";
import { buildDevRouter } from "./routes/dev.js";

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

  // Readiness for every integration — which keys are configured, no external
  // calls. Extends the /health/db convention as services are added.
  r.get("/health/integrations", async (c) =>
    c.json({
      db: await pingDb(),
      stripe: isStripeConfigured(),
      prodigi: isProdigiConfigured(),
      auth: isAuthConfigured(),
    }),
  );

  // Stripe webhook. Signature verification needs the RAW body (see stripe.ts) —
  // do not parse before verifying. Bad/missing signature → 400. Handling the
  // event (e.g. payment_intent.succeeded → Prodigi order) comes with checkout.
  r.post("/webhooks/stripe", async (c) => {
    const signature = c.req.header("stripe-signature");
    if (!signature) return c.json({ error: "missing_signature" }, 400);
    let event;
    try {
      const raw = await c.req.text();
      event = constructWebhookEvent(raw, signature);
    } catch {
      return c.json({ error: "invalid_signature" }, 400);
    }
    // Persist the order transition. Never fail the webhook on a downstream/DB
    // error — Stripe retries on non-2xx, and the handlers are idempotent. With
    // DATABASE_URL unset this is a no-op (the order lookups return null).
    try {
      await handleStripeEvent(event);
    } catch (err) {
      console.error("[webhooks/stripe] handler error", err);
    }
    return c.body(null, 204);
  });

  // Prodigi status callback. Prodigi posts order status changes here; we advance
  // the matching order and append a tracking-timeline event. Always 204 (Prodigi
  // retries on non-2xx); no-op when the order/DB is unconfigured.
  r.post("/webhooks/prodigi", async (c) => {
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ error: "invalid_payload" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return c.json({ error: "invalid_payload" }, 400);
    }
    try {
      await handleProdigiPayload(payload);
    } catch (err) {
      console.error("[webhooks/prodigi] handler error", err);
    }
    return c.body(null, 204);
  });

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

  // Account system. Fresh router instances per mount (registerRoutes runs twice).
  r.route("/account", buildAccountRouter()); // authenticated (requireUser)
  r.route("/checkout", buildCheckoutRouter()); // Stripe Checkout (guest-friendly)
  r.route("/track", buildTrackRouter()); // public order tracking
  r.route("/dev", buildDevRouter()); // dev-only, DEV_SEED_TOKEN-guarded

  return r;
}

export const app = new Hono();
app.use("*", cors());
app.route("/", registerRoutes(new Hono()));
app.route(SERVICE_PREFIX, registerRoutes(new Hono()));

// Default export is what Vercel's Hono runtime wraps as the function handler.
export default app;

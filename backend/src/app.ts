import { Hono } from "hono";
import { cors } from "hono/cors";
import { geocodeReverse, geocodeSearch, isMaptilerConfigured } from "./nominatim.js";
import { pingDb } from "./db.js";
import { constructWebhookEvent, isStripeConfigured } from "./stripe.js";
import { isArteloConfigured, verifyArteloWebhookSignature } from "./artelo.js";
import { isResendConfigured } from "./email.js";
import { isAdminConfigured, isAuthConfigured } from "./auth.js";
import { isRedisConfigured, pingRedis } from "./redis.js";
import { extractArteloOrder, handleArteloPayload, handleStripeEvent } from "./webhooks.js";
import { deferrerFor } from "./defer.js";
import { fontFiles } from "./renderPrint.js";
import { finalizeWebhookEvent, recordWebhookEvent } from "./observability.js";
import { buildAccountRouter } from "./routes/account.js";
import { buildTrackRouter } from "./routes/track.js";
import { buildCheckoutRouter } from "./routes/checkout.js";
import { buildDevRouter } from "./routes/dev.js";
import { buildUploadsRouter } from "./routes/uploads.js";
import { buildAdminRouter } from "./routes/admin.js";
import { buildJobsRouter } from "./routes/jobs.js";
import { buildLeadsRouter } from "./routes/leads.js";
import { initSentry, captureError, isSentryConfigured } from "./sentry.js";

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

  r.get("/health/redis", async (c) => c.json({ ok: await pingRedis() }));

  // Readiness for every integration — which keys are configured, no external
  // calls. Extends the /health/db convention as services are added.
  r.get("/health/integrations", async (c) =>
    c.json({
      db: await pingDb(),
      stripe: isStripeConfigured(),
      artelo: isArteloConfigured(),
      auth: isAuthConfigured(),
      admin: isAdminConfigured(),
      redis: isRedisConfigured(),
      sentry: isSentryConfigured(),
      maptiler: isMaptilerConfigured(),
      resend: isResendConfigured(),
      // Count of vendored print-render TTFs the function can actually see —
      // verifies backend/assets/fonts survived Vercel's bundling (expect 25).
      // 0 here is serious, not cosmetic: resvg 2.6.2 does NOT throw on an empty
      // font list — it silently renders every <text> as nothing and returns a
      // valid-but-textless PNG. renderPrintPng() guards against that (throws
      // instead), which ensurePrintAsset catches to fall back to the
      // client-rendered PNG — so 0 means every print render this instance
      // produces will use that lower-DPI fallback, not that renders are broken.
      printFonts: fontFiles().length,
    }),
  );

  // Stripe webhook. Signature verification needs the RAW body (see stripe.ts) —
  // do not parse before verifying. Bad/missing signature → 400. Handling the
  // event (payment_intent.succeeded / checkout.session.completed → Artelo order).
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
    // Log the raw event first and dedupe on Stripe's event id — Stripe retries on
    // non-2xx, so a re-delivery must not re-run side effects (re-submit fulfilment,
    // double-record a refund). A duplicate 204s without handling.
    const logged = await recordWebhookEvent({
      provider: "stripe",
      eventType: event.type,
      eventId: event.id,
      signatureValid: true,
      payload: event,
    });
    if (logged.duplicate) return c.body(null, 204);
    // Persist the order transition. Never fail the webhook on a downstream/DB
    // error — Stripe retries on non-2xx, and the handlers are idempotent. With
    // DATABASE_URL unset this is a no-op (the order lookups return null).
    try {
      // Defer the paid-transition side effects (Artelo submit + digital delivery)
      // past this response via waitUntil — the print render can take ~32 s, well
      // past Stripe's retry window. See defer.ts / webhooks.ts.
      const res = await handleStripeEvent(event, deferrerFor(c));
      await finalizeWebhookEvent(logged.id, {
        status: res.handled ? "processed" : "ignored",
        orderId: res.orderId,
      });
    } catch (err) {
      // Mark the event un-finished and 500 so Stripe retries — the dedupe path
      // reprocesses a 'received'/'error' row rather than skipping it as a dup.
      captureError(err);
      console.error("[webhooks/stripe] handler error", err);
      await finalizeWebhookEvent(logged.id, {
        status: "error",
        error: err instanceof Error ? err.message : "unknown",
      });
      return c.json({ error: "handler_error" }, 500);
    }
    return c.body(null, 204);
  });

  // Artelo status callback (topic OrderStatusChange). Artelo posts order status
  // changes here; we verify the HMAC signature against the RAW body, then advance
  // the matching order and append a tracking-timeline event. Always 204 on a valid
  // request (Artelo retries on non-2xx, up to 20× with backoff); no-op when the
  // order/DB is unconfigured. Bad signature/payload → 400.
  r.post("/webhooks/artelo", async (c) => {
    const raw = await c.req.text();
    const signatureValid = verifyArteloWebhookSignature(raw, c.req.header("x-artelo-signature"));
    if (!signatureValid) {
      return c.json({ error: "invalid_signature" }, 400);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return c.json({ error: "invalid_payload" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return c.json({ error: "invalid_payload" }, 400);
    }
    // Artelo has no native event id; dedupe on (artelo order id + status) so each
    // distinct status transition is processed once even though Artelo retries the
    // same callback up to ~20×. Unknown shapes fall back to no dedupe key.
    const { id: arteloId, status: arteloStatus } = extractArteloOrder(payload);
    const eventId = arteloId && arteloStatus ? `${arteloId}:${arteloStatus}` : null;
    const logged = await recordWebhookEvent({
      provider: "artelo",
      eventType: arteloStatus ?? "OrderStatusChange",
      eventId,
      signatureValid,
      payload,
    });
    if (logged.duplicate) return c.body(null, 204);
    try {
      const res = await handleArteloPayload(payload);
      await finalizeWebhookEvent(logged.id, {
        status: res.handled ? "processed" : "ignored",
        orderId: res.orderId,
      });
    } catch (err) {
      // 500 so Artelo retries (up to ~20×); the dedupe path reprocesses the
      // un-finished row instead of skipping it.
      captureError(err);
      console.error("[webhooks/artelo] handler error", err);
      await finalizeWebhookEvent(logged.id, {
        status: "error",
        error: err instanceof Error ? err.message : "unknown",
      });
      return c.json({ error: "handler_error" }, 500);
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
  r.route("/uploads", buildUploadsRouter()); // print-asset blob upload tokens
  r.route("/leads", buildLeadsRouter()); // lead-magnet: free screen-res design for an email
  r.route("/admin", buildAdminRouter()); // operator-only (requireAdmin / ADMIN_EMAILS)
  r.route("/dev", buildDevRouter()); // dev-only, DEV_SEED_TOKEN-guarded
  r.route("/jobs", buildJobsRouter()); // cron-only, CRON_SECRET-guarded (blob GC)

  return r;
}

// Initialize error tracking before the app handles any request. Env-guarded — a
// no-op without SENTRY_DSN (see ./sentry). Errors-only.
initSentry();

export const app = new Hono();
app.use("*", cors());
app.route("/", registerRoutes(new Hono()));
app.route(SERVICE_PREFIX, registerRoutes(new Hono()));

// Catch-all for errors that escape a handler (covers both mounts). Report to
// Sentry, then return a generic 500 — never leak internals to the client. Routes
// that catch their own errors (the webhooks) report via captureError directly.
app.onError((err, c) => {
  captureError(err);
  console.error("[app] unhandled error", err);
  return c.json({ error: "internal_error" }, 500);
});

// Default export is what Vercel's Hono runtime wraps as the function handler.
export default app;

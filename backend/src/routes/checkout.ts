import { Hono } from "hono";
import type { Context } from "hono";
import type Stripe from "stripe";
import type { CreateCheckoutResponse } from "@heartbound/shared";
import { type AuthVariables, getUser } from "../auth.js";
import { getStripe } from "../stripe.js";
import {
  appendOrderEvent,
  createOrder,
  getOrderStatusByCheckoutSession,
  setStripeCheckoutSessionId,
} from "../orders.js";
import { CheckoutValidationError, priceCheckout } from "../checkout.js";
import { enforce } from "../rateLimit.js";
import { getRedis, rk } from "../redis.js";

// What we stash under the idempotency claim once a session exists, so a duplicate
// request (double-click, retry) returns the same Stripe URL instead of creating a
// second order + session.
type CheckoutClaim = { status?: "pending"; orderId?: string; sessionId?: string; url?: string };

// Checkout API. Creates a Stripe Checkout Session (hosted page) for the cart and
// a matching pending_payment order; the address + email Stripe collects are
// persisted later from the checkout.session.completed webhook (see webhooks.ts).
// Guest-friendly: getUser is non-blocking, so a signed-out buyer still checks out
// (order.user_id stays null; email is backfilled from the session).

type AllowedCountry =
  Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry;

/** Countries we ship to, from CHECKOUT_ALLOWED_COUNTRIES (default US-only). */
function allowedCountries(): AllowedCountry[] {
  const raw = process.env.CHECKOUT_ALLOWED_COUNTRIES;
  const codes = raw
    ? raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : ["US"];
  return codes as AllowedCountry[];
}

/** Absolute base for success/cancel URLs: env override, else the request origin. */
function baseUrl(c: Context): string {
  const env = process.env.PUBLIC_APP_URL;
  const origin = env || c.req.header("origin") || "http://localhost:3000";
  return origin.replace(/\/$/, "");
}

export function buildCheckoutRouter(): Hono<{ Variables: AuthVariables }> {
  const r = new Hono<{ Variables: AuthVariables }>();
  r.use("*", getUser);

  r.post("/session", async (c) => {
    // Speed-bump abuse: each call creates a pending order + a Stripe session.
    if (await enforce(c, "checkout", { max: 30, windowMs: 60_000 })) {
      return c.json({ error: "rate_limited" }, 429);
    }
    const stripe = getStripe();
    if (!stripe) return c.json({ error: "stripe_unconfigured" }, 503);

    // Idempotency: when the client sends an Idempotency-Key, claim it in Redis so
    // a retry of the same attempt can't create a duplicate order/session. Best-
    // effort — if Redis is unset or hiccups we just proceed (Stripe's own
    // idempotencyKey, passed below, still dedupes the session). The actual claim
    // happens after validation so a rejected (400) cart never consumes a key.
    const idemKey = c.req.header("Idempotency-Key")?.trim() || null;
    const redis = idemKey ? getRedis() : null;
    const claimKey = idemKey ? rk("idem", "checkout", idemKey) : null;
    const releaseClaim = async () => {
      if (!redis || !claimKey) return;
      try {
        await redis.del(claimKey);
      } catch {
        // best-effort: a stale "pending" claim self-expires in 24h
      }
    };

    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

    let priced;
    try {
      priced = priceCheckout(Array.isArray(body.items) ? (body.items as never) : []);
    } catch (err) {
      if (err instanceof CheckoutValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }

    const user = c.get("user");
    const bodyEmail = typeof body.email === "string" ? body.email.trim() : "";
    const email = (user?.email ?? bodyEmail ?? "").trim();
    const userId = user?.userId ?? null;

    // Claim the idempotency key now (validated cart). A duplicate request returns
    // the prior session URL, or 409 while the first is still in flight.
    if (redis && claimKey) {
      let claimed: "OK" | CheckoutClaim | null = null;
      try {
        claimed = await redis.set(claimKey, { status: "pending" }, { nx: true, ex: 86400 });
      } catch {
        claimed = null; // proceed without idempotency rather than block checkout
      }
      if (claimed !== "OK") {
        let prev: CheckoutClaim | null = null;
        try {
          prev = await redis.get<CheckoutClaim>(claimKey);
        } catch {
          prev = null;
        }
        if (prev?.url) {
          const res: CreateCheckoutResponse = { url: prev.url };
          return c.json(res, 200);
        }
        if (prev) return c.json({ error: "in_progress" }, 409);
        // No prior claim (the set threw) → fall through with idempotency disabled.
      }
    }

    let order: { id: string; orderNumber: string };
    try {
      order = await createOrder({
        userId,
        email,
        status: "pending_payment",
        shippingCents: 0,
        items: priced.orderItems,
      });
    } catch (err) {
      console.error("[checkout] createOrder failed", err);
      await releaseClaim();
      return c.json({ error: "order_create_failed" }, 503);
    }

    const base = baseUrl(c);
    const metadata = { orderId: order.id, orderNumber: order.orderNumber };
    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: priced.lineItems,
          client_reference_id: order.id,
          metadata,
          payment_intent_data: { metadata },
          customer_email: email || undefined,
          ...(priced.hasPhysical
            ? { shipping_address_collection: { allowed_countries: allowedCountries() } }
            : {}),
          success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/cart?canceled=1`,
        },
        // Stripe-side idempotency: a retried POST with the same key returns the
        // same session instead of creating a second one.
        idemKey ? { idempotencyKey: idemKey } : undefined,
      );
      await setStripeCheckoutSessionId(order.id, session.id);
      if (!session.url) {
        await releaseClaim();
        return c.json({ error: "session_no_url" }, 502);
      }
      // Record the result so a duplicate request short-circuits to the same URL.
      if (redis && claimKey) {
        try {
          await redis.set(
            claimKey,
            { orderId: order.id, sessionId: session.id, url: session.url },
            { ex: 86400 },
          );
        } catch {
          // best-effort: dedupe just won't fire for this attempt
        }
      }
      const res: CreateCheckoutResponse = { url: session.url };
      return c.json(res, 200);
    } catch (err) {
      console.error("[checkout] stripe session create failed", err);
      await releaseClaim();
      // The pending order is orphaned (never goes paid). Leave an audit trail.
      try {
        await appendOrderEvent(order.id, {
          message: "Checkout session creation failed",
          source: "system",
        });
      } catch {
        // best-effort
      }
      return c.json({ error: "stripe_session_failed" }, 502);
    }
  });

  r.get("/session/:id", async (c) => {
    // Unauthenticated (guest success page reads it), so throttle to blunt any
    // scraping of order status by Stripe session id.
    if (await enforce(c, "checkout-status", { max: 60, windowMs: 60_000 })) {
      return c.json({ error: "rate_limited" }, 429);
    }
    const status = await getOrderStatusByCheckoutSession(c.req.param("id"));
    if (!status) return c.json({ error: "not_found" }, 404);
    return c.json(status, 200);
  });

  return r;
}

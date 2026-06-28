import { Hono } from "hono";
import type { Context } from "hono";
import type Stripe from "stripe";
import type { CreateCheckoutResponse } from "@pinprint/shared";
import { type AuthVariables, getUser } from "../auth.js";
import { getStripe } from "../stripe.js";
import {
  appendOrderEvent,
  createOrder,
  getOrderStatusByCheckoutSession,
  setStripeCheckoutSessionId,
} from "../orders.js";
import { CheckoutValidationError, priceCheckout } from "../checkout.js";

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
    const stripe = getStripe();
    if (!stripe) return c.json({ error: "stripe_unconfigured" }, 503);

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
      return c.json({ error: "order_create_failed" }, 503);
    }

    const base = baseUrl(c);
    const metadata = { orderId: order.id, orderNumber: order.orderNumber };
    try {
      const session = await stripe.checkout.sessions.create({
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
      });
      await setStripeCheckoutSessionId(order.id, session.id);
      if (!session.url) return c.json({ error: "session_no_url" }, 502);
      const res: CreateCheckoutResponse = { url: session.url };
      return c.json(res, 200);
    } catch (err) {
      console.error("[checkout] stripe session create failed", err);
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
    const status = await getOrderStatusByCheckoutSession(c.req.param("id"));
    if (!status) return c.json({ error: "not_found" }, 404);
    return c.json(status, 200);
  });

  return r;
}

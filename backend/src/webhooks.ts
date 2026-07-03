import type Stripe from "stripe";
import type { OrderStatus, OrderTracking, OrderShippingAddress } from "@pinprint/shared";
import {
  advanceOrderStatus,
  appendOrderEvent,
  applyCheckoutDetails,
  findOrderById,
  findOrderByArteloId,
  findOrderByStripeCheckoutSession,
  findOrderByStripePaymentIntent,
  setArteloStatus,
  setRefundAmount,
} from "./orders.js";
import { submitOrderToArtelo } from "./fulfillment.js";
import { deliverDigitalFiles } from "./digitalDelivery.js";
import { runNow, type Deferrer } from "./defer.js";
import { capturePostHogServerEvent } from "./posthog.js";

// Order persistence driven by the Stripe and Artelo webhooks. The DB-touching
// handlers no-op gracefully when DATABASE_URL is unset (the find* helpers return
// null), so an unconfigured deploy still 204s. The pure mapping helpers below are
// exported for unit testing without a database.

// ── Artelo mapping (pure) ────────────────────────────────────────────────────

/**
 * Map an Artelo order status to our order status. `Received` maps to null — the
 * order is already `paid` on our side, so there's nothing to advance.
 */
export function mapArteloStatus(status: string): OrderStatus | null {
  switch (status) {
    case "InProduction":
      return "in_production";
    case "Shipped":
      return "shipped";
    case "Delivered":
      return "delivered";
    case "Canceled":
      return "cancelled";
    default:
      return null;
  }
}

type ArteloShipment = {
  carrierCode?: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

/** Pull carrier/tracking from the first shipment, if any. */
export function trackingFromShipments(shipments: unknown): OrderTracking | undefined {
  if (!Array.isArray(shipments) || shipments.length === 0) return undefined;
  const s = shipments[0] as ArteloShipment;
  const tracking: OrderTracking = {
    carrier: s.carrierCode,
    number: s.trackingNumber,
    url: s.trackingUrl,
  };
  if (!tracking.carrier && !tracking.number && !tracking.url) return undefined;
  return tracking;
}

/** Normalize an Artelo OrderStatusChange callback (bare order or {data:{order}}). */
export function extractArteloOrder(payload: unknown): {
  id?: string;
  status?: string;
  shipments?: unknown;
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const order = ((data?.order ?? root.order ?? root) ?? {}) as Record<string, unknown>;
  return {
    id: typeof order.id === "string" ? order.id : undefined,
    status: typeof order.status === "string" ? (order.status as string) : undefined,
    shipments: order.shipments,
  };
}

// ── Stripe checkout mapping (pure) ───────────────────────────────────────────

/**
 * Pull the buyer details Stripe collected on the hosted page off a completed
 * session. Shipping lives under `collected_information.shipping_details` in the
 * pinned API version (note Stripe's field names: `state`/`postal_code`). Pure so
 * it's unit-testable without a Stripe client or DB.
 */
export function extractCheckoutDetails(session: Stripe.Checkout.Session): {
  email?: string;
  paymentIntentId?: string;
  shipping?: OrderShippingAddress;
} {
  const email = session.customer_details?.email ?? session.customer_email ?? undefined;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const sd = session.collected_information?.shipping_details;
  let shipping: OrderShippingAddress | undefined;
  if (sd) {
    const a = sd.address;
    shipping = {
      name: sd.name ?? undefined,
      line1: a?.line1 ?? undefined,
      line2: a?.line2 ?? undefined,
      city: a?.city ?? undefined,
      region: a?.state ?? undefined,
      postal: a?.postal_code ?? undefined,
      country: a?.country ?? undefined,
    };
    if (!Object.values(shipping).some(Boolean)) shipping = undefined;
  }

  return { email: email ?? undefined, paymentIntentId, shipping };
}

// ── Handlers (DB-touching; no-op when unconfigured) ──────────────────────────

/** Result of handling a webhook — the resolved order id, for the inbound log. */
export type WebhookHandled = { handled: boolean; orderId?: string | null };

/**
 * Advance an order in response to a Stripe webhook event. The two paid-transition
 * side effects (Artelo submit + digital delivery) are handed to `defer` rather
 * than awaited: the server-side print render can take ~32 s, which would blow
 * Stripe's ~20 s webhook-retry window. The route injects a waitUntil-backed
 * deferrer (see defer.ts); the default runs them fire-and-forget in-process.
 * Both are idempotent + never-throw, so deferral doesn't change semantics.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  defer: Deferrer = runNow,
): Promise<WebhookHandled> {
  // A well-formed Stripe event always carries data.object; a missing one is a
  // malformed/irrelevant delivery, not a transient failure — ignore it (so the
  // route 204s) rather than throwing into the 500/retry path.
  if (!(event.data as { object?: unknown } | undefined)?.object) {
    return { handled: false };
  }
  switch (event.type) {
    // `completed` fires when the session finishes; for async methods (bank debits)
    // it can arrive before funds settle, with `async_payment_succeeded` following.
    // Treat both, but only advance to paid once payment_status is actually paid.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      // Locate by metadata.orderId first — it's set at session-creation time, so
      // this is race-free even if the session id write hasn't committed yet.
      const orderId =
        (typeof s.metadata?.orderId === "string" && s.metadata.orderId) ||
        (typeof s.client_reference_id === "string" && s.client_reference_id) ||
        null;
      const piId =
        typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      const located =
        (orderId ? await findOrderById(orderId) : null) ??
        (await findOrderByStripeCheckoutSession(s.id)) ??
        (piId ? await findOrderByStripePaymentIntent(piId) : null);
      if (!located) return { handled: false };
      // Persist the address + email + payment-intent id Stripe collected first,
      // so the order has a shipping address before we hand it to Artelo.
      // Idempotent (set-if-empty / coalesce / set-once), so retries are safe.
      await applyCheckoutDetails(located.id, extractCheckoutDetails(s));
      // Only mark paid when the money is actually captured. A `completed` session
      // with payment_status 'unpaid' (async/processing) must NOT trigger fulfilment.
      const settled = s.payment_status === "paid" || s.payment_status === "no_payment_required";
      if (settled && located.status === "pending_payment") {
        await advanceOrderStatus(located.id, "paid", {
          message: "Payment received",
          source: "stripe",
          payload: event,
        });
        // Hand the paid order to Artelo — deferred past the response because it
        // now renders the exact-DPI print PNG server-side first (~32 s for
        // textured templates), which must not hold up (or time out) the webhook.
        // Self-guarded: no-ops when Artelo is unconfigured, idempotent (skips if
        // already submitted / reuses the render), skips digital-only orders, and
        // never throws — a fulfilment hiccup must not fail the Stripe webhook.
        defer(() => submitOrderToArtelo(located.id));
        // Email the order's digital files (the $19 tier itself, or the free
        // bonus bundled with every print). Same isolation contract, also deferred:
        // self-guarded, idempotent (claims digital_delivered_at once), and never
        // allowed to fail this webhook.
        defer(() => deliverDigitalFiles(located.id));
        // Canonical checkout_completed — captured server-side (not from the
        // client success page) so it's trustworthy even if the buyer closes the
        // tab before the confirmation page loads. Never awaited into the webhook.
        defer(() =>
          capturePostHogServerEvent("checkout_completed", located.id, {
            order_id: located.id,
            total_cents: s.amount_total ?? undefined,
            currency: s.currency ?? undefined,
          }),
        );
      }
      return { handled: true, orderId: located.id };
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const located = await findOrderByStripePaymentIntent(pi.id);
      if (located && located.status === "pending_payment") {
        await advanceOrderStatus(located.id, "paid", {
          message: "Payment received",
          source: "stripe",
          payload: event,
        });
      }
      return { handled: Boolean(located), orderId: located?.id ?? null };
    }
    case "charge.refunded": {
      const ch = event.data.object as Stripe.Charge;
      const piId =
        typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      const located = piId ? await findOrderByStripePaymentIntent(piId) : null;
      if (!located) return { handled: false };
      // Stripe reports the cumulative refunded amount; record it monotonically.
      const refunded = typeof ch.amount_refunded === "number" ? ch.amount_refunded : 0;
      const total = typeof ch.amount === "number" ? ch.amount : refunded;
      await setRefundAmount(located.id, refunded).catch(() => {});
      const fullyRefunded = refunded >= total && refunded > 0;
      if (fullyRefunded && located.status !== "refunded") {
        await advanceOrderStatus(located.id, "refunded", {
          message: "Payment fully refunded",
          source: "stripe",
          payload: event,
        });
      } else {
        // Partial refund — keep the order in its fulfilment state, just note it.
        await appendOrderEvent(located.id, {
          message: `Partial refund recorded (${refunded} of ${total})`,
          source: "stripe",
          payload: event,
        }).catch(() => {});
      }
      return { handled: true, orderId: located.id };
    }
    case "checkout.session.expired": {
      // The buyer abandoned the hosted session. Leave the order pending_payment
      // (a later session can still complete it) but note it for cleanup/visibility.
      const s = event.data.object as Stripe.Checkout.Session;
      const located = await findOrderByStripeCheckoutSession(s.id);
      if (!located) return { handled: false };
      if (located.status === "pending_payment") {
        await appendOrderEvent(located.id, {
          message: "Checkout session expired",
          source: "stripe",
          payload: event,
        });
      }
      return { handled: true, orderId: located.id };
    }
    case "charge.dispute.created": {
      // A chargeback was opened — surface it on the order timeline for the operator.
      const dispute = event.data.object as Stripe.Dispute;
      const piId =
        typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id;
      const located = piId ? await findOrderByStripePaymentIntent(piId) : null;
      if (!located) return { handled: false };
      await appendOrderEvent(located.id, {
        message: `Dispute opened (${dispute.reason})`,
        source: "stripe",
        payload: event,
      });
      return { handled: true, orderId: located.id };
    }
    default:
      return { handled: false };
  }
}

/** Advance an order in response to an Artelo OrderStatusChange callback. */
export async function handleArteloPayload(payload: unknown): Promise<WebhookHandled> {
  const { id, status: arteloStatus, shipments } = extractArteloOrder(payload);
  if (!id || !arteloStatus) return { handled: false };
  const located = await findOrderByArteloId(id);
  if (!located) return { handled: false };
  // Always record Artelo's raw status (even for ones we don't map), for observability.
  await setArteloStatus(located.id, arteloStatus).catch(() => {});
  const status = mapArteloStatus(arteloStatus);
  if (!status) return { handled: false, orderId: located.id };
  await advanceOrderStatus(located.id, status, {
    message: `Artelo: ${arteloStatus}`,
    source: "artelo",
    payload,
    tracking: trackingFromShipments(shipments),
  });
  return { handled: true, orderId: located.id };
}

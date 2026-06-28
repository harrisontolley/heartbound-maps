import type Stripe from "stripe";
import type { OrderStatus, OrderTracking, OrderShippingAddress } from "@pinprint/shared";
import {
  advanceOrderStatus,
  applyCheckoutDetails,
  findOrderById,
  findOrderByProdigiId,
  findOrderByStripeCheckoutSession,
  findOrderByStripePaymentIntent,
} from "./orders.js";

// Order persistence driven by the Stripe and Prodigi webhooks. The DB-touching
// handlers no-op gracefully when DATABASE_URL is unset (the find* helpers return
// null), so an unconfigured deploy still 204s. The pure mapping helpers below are
// exported for unit testing without a database.

// ── Prodigi mapping (pure) ───────────────────────────────────────────────────

/** Map a Prodigi fulfilment stage to our order status. */
export function mapProdigiStage(stage: string): OrderStatus | null {
  switch (stage) {
    case "InProgress":
      return "in_production";
    case "Complete":
      return "shipped"; // Prodigi "Complete" == dispatched
    case "Cancelled":
      return "cancelled";
    default:
      return null;
  }
}

type ProdigiShipment = {
  carrier?: { name?: string; service?: string };
  tracking?: { number?: string; url?: string };
};

/** Pull carrier/tracking from the first shipment, if any. */
export function trackingFromShipments(shipments: unknown): OrderTracking | undefined {
  if (!Array.isArray(shipments) || shipments.length === 0) return undefined;
  const s = shipments[0] as ProdigiShipment;
  const tracking: OrderTracking = {
    carrier: s.carrier?.name,
    number: s.tracking?.number,
    url: s.tracking?.url,
  };
  if (!tracking.carrier && !tracking.number && !tracking.url) return undefined;
  return tracking;
}

/** Normalize a Prodigi callback (handles both the bare order and CloudEvents wrap). */
export function extractProdigiOrder(payload: unknown): {
  id?: string;
  stage?: string;
  shipments?: unknown;
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const order = ((data?.order ?? root.order ?? root) ?? {}) as Record<string, unknown>;
  const status = order.status as Record<string, unknown> | undefined;
  return {
    id: typeof order.id === "string" ? order.id : undefined,
    stage: typeof status?.stage === "string" ? (status.stage as string) : undefined,
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

/** Advance an order in response to a Stripe webhook event. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
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
      if (!located) break;
      if (located.status === "pending_payment") {
        await advanceOrderStatus(located.id, "paid", {
          message: "Payment received",
          source: "stripe",
          payload: event,
        });
      }
      // Persist the address + email + payment-intent id Stripe collected.
      // Idempotent (set-if-empty / coalesce / set-once), so retries are safe.
      await applyCheckoutDetails(located.id, extractCheckoutDetails(s));
      break;
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
      break;
    }
    case "charge.refunded": {
      const ch = event.data.object as Stripe.Charge;
      const piId =
        typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      const located = piId ? await findOrderByStripePaymentIntent(piId) : null;
      if (located) {
        await advanceOrderStatus(located.id, "refunded", {
          message: "Payment refunded",
          source: "stripe",
          payload: event,
        });
      }
      break;
    }
    default:
      break;
  }
}

/** Advance an order in response to a Prodigi status callback. */
export async function handleProdigiPayload(payload: unknown): Promise<{ handled: boolean }> {
  const { id, stage, shipments } = extractProdigiOrder(payload);
  if (!id || !stage) return { handled: false };
  const status = mapProdigiStage(stage);
  if (!status) return { handled: false };
  const located = await findOrderByProdigiId(id);
  if (!located) return { handled: false };
  await advanceOrderStatus(located.id, status, {
    message: `Prodigi: ${stage}`,
    source: "prodigi",
    payload,
    tracking: trackingFromShipments(shipments),
  });
  return { handled: true };
}

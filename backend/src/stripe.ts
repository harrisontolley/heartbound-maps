import Stripe from "stripe";

// Stripe client, scaffolded like db.ts: lazy, env-guarded, null when unconfigured
// so the app builds and tests run without a key. Pricing/products/checkout are not
// built yet — this is just the client + webhook signature plumbing. The secret key
// is backend-only and must never reach the client.

let client: Stripe | null = null;

// Pin the API version so request/response shapes never drift from what this code
// reads (e.g. session.collected_information.shipping_details in webhooks.ts). This
// matches the version the installed SDK's types are generated against; bump it
// deliberately alongside an SDK upgrade, never implicitly via the account default.
const STRIPE_API_VERSION = "2026-06-24.dahlia";

/** Returns a Stripe client, or null when STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe | null {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return client;
}

/** Whether the Stripe secret key is present (no network call). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Verify and parse a webhook payload. `rawBody` MUST be the unparsed request body
 * — verification fails against re-serialized JSON. Throws on a missing/invalid
 * signature or when Stripe is unconfigured.
 */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) throw new Error("stripe_not_configured");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export type RefundResult = {
  refundId: string;
  amountCents: number;
  /** Cumulative amount refunded on the charge after this refund, in cents. */
  cumulativeRefundedCents: number;
  status: string | null;
};

/**
 * Refund a payment intent (full when `amountCents` is omitted, else partial).
 * Uses a Stripe idempotency key so a retried admin click can't double-refund.
 * Throws when Stripe is unconfigured or the refund call fails.
 */
export async function refundPaymentIntent(
  paymentIntentId: string,
  opts: { amountCents?: number; reason?: string; idempotencyKey?: string } = {},
): Promise<RefundResult> {
  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");
  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(opts.amountCents ? { amount: opts.amountCents } : {}),
      ...(opts.reason ? { metadata: { reason: opts.reason } } : {}),
    },
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
  );
  // Read the charge's cumulative refunded total so our record matches the webhook.
  let cumulative = refund.amount ?? opts.amountCents ?? 0;
  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      if (typeof charge.amount_refunded === "number") cumulative = charge.amount_refunded;
    } catch {
      /* fall back to this refund's amount */
    }
  }
  return {
    refundId: refund.id,
    amountCents: refund.amount ?? opts.amountCents ?? 0,
    cumulativeRefundedCents: cumulative,
    status: refund.status,
  };
}

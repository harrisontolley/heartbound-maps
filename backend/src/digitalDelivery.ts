import { signAssetUrl } from "./blob.js";
import { getSql } from "./db.js";
import { isResendConfigured, sendEmail } from "./email.js";
import { digitalDeliveryEmail, type DigitalDeliveryItem } from "./emails/digitalDelivery.js";
import {
  appendOrderEvent,
  claimDigitalDelivery,
  getOrderForDigitalDelivery,
  releaseDigitalDeliveryClaim,
  type DigitalDeliveryOrder,
} from "./orders.js";

// Post-payment digital delivery: emails signed links to every order item's PNG
// (and SVG, when present) once an order is paid. Mirrors fulfillment.ts's
// shape — never throws, idempotent, env-guarded, logs to order_events — but
// the idempotency guard here is a claim/release pair on
// `orders.digital_delivered_at` rather than a single "already submitted"
// check, because unlike an Artelo submission there's no external record to
// query: the atomic conditional UPDATE (claimDigitalDelivery) *is* the
// idempotency check, closing the race where two overlapping paid-transition
// webhooks would otherwise both pass a plain read and double-send the email.
// See docs (task B-3) for the full flow diagram.

export type DeliveryResult = { delivered: boolean; reason?: string };

/** True when at least one line item was bought as the standalone digital format. */
function isDigitalOrder(order: DigitalDeliveryOrder): boolean {
  return order.items.some((it) => it.posterConfig?.format === "digital");
}

/** Sign an order item's PNG/SVG (default 30-day TTL), skipping nulls. */
async function signItem(item: DigitalDeliveryOrder["items"][number]): Promise<DigitalDeliveryItem> {
  const [pngUrl, svgUrl] = await Promise.all([
    item.assetUrl ? signAssetUrl(item.assetUrl) : Promise.resolve(null),
    item.svgAssetUrl ? signAssetUrl(item.svgAssetUrl) : Promise.resolve(null),
  ]);
  return { label: item.productLabel, pngUrl, svgUrl };
}

/**
 * Email a paid order's digital files (PNG + SVG) to the buyer. Called
 * fire-and-forget from the Stripe webhook once an order reaches "paid" —
 * callers must swallow any rejection themselves too, but this function is
 * belt-and-braces never-throwing on its own so a delivery hiccup can never
 * fail (or retry-loop) the webhook that triggered it.
 */
export async function deliverDigitalFiles(orderId: string): Promise<DeliveryResult> {
  if (!getSql() || !isResendConfigured()) return { delivered: false, reason: "unconfigured" };

  let order: DigitalDeliveryOrder | null;
  try {
    order = await getOrderForDigitalDelivery(orderId);
  } catch {
    return { delivered: false, reason: "load_failed" };
  }
  if (!order) return { delivered: false, reason: "order_not_found" };
  if (order.digitalDeliveredAt) return { delivered: false, reason: "already_delivered" };

  const hasAnyAsset = order.items.some((it) => it.assetUrl || it.svgAssetUrl);
  if (!hasAnyAsset) {
    // Sold before assets were captured (legacy order) or the best-effort
    // uploads at add-to-cart failed. Nothing to deliver — note it on the
    // timeline so an operator can see why.
    await appendOrderEvent(order.id, {
      message: "Digital delivery skipped: no digital assets on file for this order.",
      source: "system",
    }).catch(() => {});
    return { delivered: false, reason: "no_assets" };
  }

  // Atomically claim the delivery before doing any work that has a visible
  // side effect (sending an email). If we lose the race, someone else's call
  // already claimed it — treat exactly like "already delivered".
  let claimed: boolean;
  try {
    claimed = await claimDigitalDelivery(order.id);
  } catch {
    return { delivered: false, reason: "claim_failed" };
  }
  if (!claimed) return { delivered: false, reason: "already_delivered" };

  try {
    const items = await Promise.all(order.items.map(signItem));
    const email = digitalDeliveryEmail({ items, isDigitalOrder: isDigitalOrder(order) });
    const sent = await sendEmail({ to: order.email, subject: email.subject, html: email.html, text: email.text });

    if (!sent) {
      await releaseDigitalDeliveryClaim(order.id).catch(() => {});
      await appendOrderEvent(order.id, {
        message: "Digital delivery failed: email send failed",
        source: "system",
      }).catch(() => {});
      return { delivered: false, reason: "email_send_failed" };
    }

    await appendOrderEvent(order.id, {
      message: "Digital files emailed",
      source: "system",
    }).catch(() => {});
    return { delivered: true };
  } catch {
    await releaseDigitalDeliveryClaim(order.id).catch(() => {});
    await appendOrderEvent(order.id, {
      message: "Digital delivery failed: email send failed",
      source: "system",
    }).catch(() => {});
    return { delivered: false, reason: "email_send_failed" };
  }
}

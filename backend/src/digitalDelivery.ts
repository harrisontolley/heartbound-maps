import { signAssetUrl } from "./blob.js";
import { buildCoordinateStory } from "./emails/coordinateStory.js";
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
// (and SVG, when present) once an order is paid, plus the bonus phone/desktop
// wallpaper renders (when uploaded) and a coordinate story built from the
// stored poster_config. Mirrors fulfillment.ts's shape — never throws,
// idempotent, env-guarded, logs to order_events — but the idempotency guard
// here is a claim/release pair on `orders.digital_delivered_at` rather than a
// single "already submitted" check, because unlike an Artelo submission
// there's no external record to query: the atomic conditional UPDATE
// (claimDigitalDelivery) *is* the idempotency check, closing the race where
// two overlapping paid-transition webhooks would otherwise both pass a plain
// read and double-send the email. See docs (task B-3) for the full flow
// diagram — the bonus stack (phone/desktop wallpapers + coordinate story) is
// additive on top of that and doesn't change the delivery/idempotency shape.

export type DeliveryResult = { delivered: boolean; reason?: string };

/** True when at least one line item was bought as the standalone digital format. */
function isDigitalOrder(order: DigitalDeliveryOrder): boolean {
  return order.items.some((it) => it.posterConfig?.format === "digital");
}

/**
 * Absolute URL for the static hanging/care guide, linked from the delivery
 * email. Mirrors orderEmails.ts's frontendBaseUrl/trackUrl helpers (a small
 * bespoke duplicate rather than a shared one, matching this codebase's
 * existing convention of per-module link helpers — see that file's doc
 * comment for the fuller rationale). No request-Origin fallback since this
 * runs from a deferred webhook task; returns null when unconfigured on
 * Vercel so the email omits the link rather than shipping a broken one.
 */
function hangingGuideUrl(): string | null {
  const publicAppUrl = process.env.PUBLIC_APP_URL;
  const base = publicAppUrl
    ? publicAppUrl.replace(/\/$/, "")
    : process.env.VERCEL
      ? null
      : "http://localhost:3000";
  return base ? `${base}/hanging-guide` : null;
}

/**
 * Sign an order item's PNG/SVG/bonus-wallpaper URLs (default 30-day TTL,
 * skipping nulls) and build its coordinate story from the stored
 * poster_config snapshot. Mixes I/O (signing) with a pure step (the story)
 * because both are per-item and this is the one place that already maps
 * over `order.items`.
 */
async function signItem(item: DigitalDeliveryOrder["items"][number]): Promise<DigitalDeliveryItem> {
  const [pngUrl, svgUrl, phoneWallpaperUrl, desktopWallpaperUrl] = await Promise.all([
    item.assetUrl ? signAssetUrl(item.assetUrl) : Promise.resolve(null),
    item.svgAssetUrl ? signAssetUrl(item.svgAssetUrl) : Promise.resolve(null),
    item.phoneWallpaperAssetUrl ? signAssetUrl(item.phoneWallpaperAssetUrl) : Promise.resolve(null),
    item.desktopWallpaperAssetUrl ? signAssetUrl(item.desktopWallpaperAssetUrl) : Promise.resolve(null),
  ]);
  return {
    label: item.productLabel,
    pngUrl,
    svgUrl,
    phoneWallpaperUrl,
    desktopWallpaperUrl,
    story: buildCoordinateStory(item.posterConfig),
  };
}

/**
 * Deliverable items (at least one asset present) that are missing their
 * promised phone and/or desktop wallpaper bonus. Wallpaper rendering is
 * client-side best-effort at add-to-cart time (see cart/page.tsx), so a
 * customer can pay for a print that never got one or both bonus renders
 * with nothing on the server side ever noticing — until this check. Returns
 * null when every deliverable item has both, so callers can skip the event
 * entirely in the common case.
 */
function missingBonusNote(items: DigitalDeliveryOrder["items"]): string | null {
  const notes = items
    .filter((it) => it.assetUrl || it.svgAssetUrl)
    .flatMap((it) => {
      const missing: string[] = [];
      if (!it.phoneWallpaperAssetUrl) missing.push("phone wallpaper");
      if (!it.desktopWallpaperAssetUrl) missing.push("desktop wallpaper");
      return missing.length ? [`${it.productLabel} (missing ${missing.join(", ")})`] : [];
    });
  return notes.length ? notes.join("; ") : null;
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
    const email = digitalDeliveryEmail({
      items,
      isDigitalOrder: isDigitalOrder(order),
      hangingGuideUrl: hangingGuideUrl(),
    });
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

    // Pricing promises phone + desktop wallpapers with every print, but
    // generation is client-side best-effort, so log it when a bonus never
    // made it onto the order — never blocks delivery, just gives support a
    // signal to follow up proactively.
    const bonusNote = missingBonusNote(order.items);
    if (bonusNote) {
      await appendOrderEvent(order.id, {
        message: `Digital delivery missing promised bonus wallpaper(s): ${bonusNote}`,
        source: "system",
      }).catch(() => {});
    }

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

import { formatUsd, GUARANTEE_NAME } from "@heartbound/shared";
import { escapeHtml } from "./leadMagnet.js";

// Pure email template — no I/O. Fired once from the paid transition (see
// orderEmails.ts / webhooks.ts) so a buyer gets a real, branded receipt
// instead of the false "we've emailed your receipt" claim the success page
// used to make before this existed. Table-based HTML with inline styles
// only, same email-client-safe baseline as digitalDelivery.ts.
//
// A digital-only order (no shippingAddress collected at checkout — see
// extractCheckoutDetails in webhooks.ts) has nothing to ship, so the
// shipping-address block and delivery-window line are only rendered when a
// shippingAddress is present; the "your digital files arrive separately"
// note always shows, since every order — digital purchase or free bundle —
// gets a follow-up digitalDelivery.ts email once files are ready.

export type OrderConfirmationItem = {
  /** Order-item label, e.g. "16 × 24 in Vintage Cartography — Melbourne". */
  label: string;
  quantity: number;
  unitPriceCents: number;
};

export type OrderConfirmationShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
};

export type OrderConfirmationEmailInput = {
  orderNumber: string;
  items: OrderConfirmationItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  shippingAddress?: OrderConfirmationShippingAddress;
  /** Absolute URL to the public order-tracking page, or null to omit the link
   * (e.g. the frontend origin isn't configured yet) rather than ship a broken
   * href. */
  trackUrl: string | null;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const DELIVERY_WINDOW_NOTE =
  "Your print is made and shipped within 2 to 3 business days, and arrives within 5 to 10 business days total. You'll get another email the moment it ships.";

const DIGITAL_FILES_NOTE =
  "Your digital design files (including a free copy alongside any print) will arrive in a separate email once they're ready.";

const GUARANTEE_NOTE =
  `Every order is covered by ${GUARANTEE_NAME}: if it arrives damaged or with a fault, send us a quick photo and we'll ship a free replacement or refund you in full.`;

function money(cents: number): string {
  return formatUsd(cents);
}

function itemRowHtml(item: OrderConfirmationItem): string {
  const safeLabel = escapeHtml(item.label);
  const lineTotal = money(item.unitPriceCents * item.quantity);
  return `
            <tr>
              <td style="padding:0 40px 12px 40px;">
                <p style="margin:0; font-size:14px; line-height:1.6; color:#1a1a1a;">
                  <strong>${safeLabel}</strong><br/>
                  <span style="color:#6b6b6b;">Qty ${item.quantity} &times; ${money(item.unitPriceCents)} = ${lineTotal}</span>
                </p>
              </td>
            </tr>`;
}

function itemLineText(item: OrderConfirmationItem): string {
  const lineTotal = money(item.unitPriceCents * item.quantity);
  return `${item.label}\n  Qty ${item.quantity} x ${money(item.unitPriceCents)} = ${lineTotal}`;
}

function addressLines(a: OrderConfirmationShippingAddress): string[] {
  const cityLine = [a.city, a.region, a.postal].filter(Boolean).join(", ");
  return [a.name, a.line1, a.line2, cityLine, a.country].filter((s): s is string => Boolean(s && s.length));
}

function addressHtml(a: OrderConfirmationShippingAddress): string {
  const lines = addressLines(a).map(escapeHtml);
  return `
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <p style="margin:0 0 6px 0; font-size:13px; letter-spacing:0.04em; text-transform:uppercase; color:#6b6b6b;">Shipping to</p>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#1a1a1a;">
                  ${lines.join("<br/>")}
                </p>
              </td>
            </tr>`;
}

export function orderConfirmationEmail(input: OrderConfirmationEmailInput): EmailContent {
  const { orderNumber, items, subtotalCents, shippingCents, totalCents, shippingAddress, trackUrl } = input;
  const subject = `Your Heartbound Maps order ${orderNumber} is confirmed`;
  const shippingLabel = shippingCents === 0 ? "Free" : money(shippingCents);
  const hasShipping = Boolean(shippingAddress && addressLines(shippingAddress).length > 0);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f4f1ec; font-family:Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 24px 40px; text-align:center; color:#1a1a1a;">
                <h1 style="margin:0 0 8px 0; font-size:22px; font-weight:normal; color:#1a1a1a;">Order confirmed</h1>
                <p style="margin:0; font-size:14px; color:#6b6b6b;">Order ${escapeHtml(orderNumber)}</p>
              </td>
            </tr>
            ${items.map(itemRowHtml).join("\n")}
            <tr>
              <td style="padding:12px 40px 24px 40px; border-top:1px solid #eee;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:14px; color:#3a3a3a; padding:2px 0;">Subtotal</td>
                    <td style="font-size:14px; color:#3a3a3a; padding:2px 0; text-align:right;">${money(subtotalCents)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px; color:#3a3a3a; padding:2px 0;">Shipping</td>
                    <td style="font-size:14px; color:#3a3a3a; padding:2px 0; text-align:right;">${shippingLabel}</td>
                  </tr>
                  <tr>
                    <td style="font-size:15px; color:#1a1a1a; font-weight:bold; padding:8px 0 0 0;">Total</td>
                    <td style="font-size:15px; color:#1a1a1a; font-weight:bold; padding:8px 0 0 0; text-align:right;">${money(totalCents)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${hasShipping && shippingAddress ? addressHtml(shippingAddress) : ""}
            <tr>
              <td style="padding:0 40px 20px 40px; text-align:left; color:#3a3a3a;">
                <p style="margin:0 0 12px 0; font-size:14px; line-height:1.7;">
                  ${hasShipping ? escapeHtml(DELIVERY_WINDOW_NOTE) : ""}
                </p>
                <p style="margin:0 0 12px 0; font-size:14px; line-height:1.7;">
                  ${escapeHtml(DIGITAL_FILES_NOTE)}
                </p>
                <p style="margin:0; font-size:14px; line-height:1.7;">
                  ${escapeHtml(GUARANTEE_NOTE)}
                </p>
              </td>
            </tr>
            ${
              trackUrl
                ? `<tr>
              <td align="center" style="padding:8px 40px 40px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#1a1a1a; border-radius:4px;">
                      <a href="${escapeHtml(trackUrl)}" style="display:inline-block; padding:14px 32px; font-size:15px; color:#ffffff; text-decoration:none; letter-spacing:0.02em;">
                        Track your order
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Order confirmed",
    `Order ${orderNumber}`,
    "",
    ...items.flatMap((item) => [itemLineText(item), ""]),
    `Subtotal: ${money(subtotalCents)}`,
    `Shipping: ${shippingLabel}`,
    `Total: ${money(totalCents)}`,
    "",
    ...(hasShipping && shippingAddress
      ? ["Shipping to:", ...addressLines(shippingAddress), ""]
      : []),
    ...(hasShipping ? [DELIVERY_WINDOW_NOTE, ""] : []),
    DIGITAL_FILES_NOTE,
    "",
    GUARANTEE_NOTE,
    ...(trackUrl ? ["", `Track your order: ${trackUrl}`] : []),
  ].join("\n");

  return { subject, html, text };
}

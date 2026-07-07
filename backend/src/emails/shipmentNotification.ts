import { escapeHtml } from "./leadMagnet.js";

// Pure email template — no I/O. One template parameterized on "shipped" |
// "delivered", fired from an Artelo status transition (see orderEmails.ts /
// webhooks.ts's handleArteloPayload, and admin.ts's manual sync). Table-based
// HTML with inline styles only, same conventions as the other templates here.

export type ShipmentNotificationKind = "shipped" | "delivered";

export type ShipmentTracking = {
  carrier?: string;
  number?: string;
  url?: string;
};

export type ShipmentNotificationEmailInput = {
  kind: ShipmentNotificationKind;
  orderNumber: string;
  tracking?: ShipmentTracking;
  /** Absolute URL to the public order-tracking page, or null to omit the link
   * rather than ship a broken href. */
  trackUrl: string | null;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

function introFor(kind: ShipmentNotificationKind): { subjectPhrase: string; heading: string; body: string } {
  if (kind === "shipped") {
    return {
      subjectPhrase: "shipped",
      heading: "Your order is on its way",
      body: "Good news. Your print has shipped and is on its way to you.",
    };
  }
  return {
    // "has delivered" reads as carrier-speak; "has been delivered" is the
    // grammatical passive voice a person would actually say.
    subjectPhrase: "been delivered",
    heading: "Your order has arrived",
    body: "Your print has arrived. We hope you love it on the wall.",
  };
}

function trackingLinesHtml(tracking: ShipmentTracking | undefined): string {
  if (!tracking || (!tracking.carrier && !tracking.number && !tracking.url)) return "";
  const rows: string[] = [];
  if (tracking.carrier) rows.push(`Carrier: ${escapeHtml(tracking.carrier)}`);
  if (tracking.number) rows.push(`Tracking number: ${escapeHtml(tracking.number)}`);
  const linkRow = tracking.url
    ? `<a href="${escapeHtml(tracking.url)}" style="color:#1a1a1a; text-decoration:underline;">Track your package with the carrier</a>`
    : "";
  return `
            <tr>
              <td style="padding:0 40px 20px 40px; text-align:center; color:#3a3a3a;">
                <p style="margin:0; font-size:14px; line-height:1.8;">
                  ${rows.join("<br/>")}
                  ${rows.length && linkRow ? "<br/>" : ""}${linkRow}
                </p>
              </td>
            </tr>`;
}

function trackingLinesText(tracking: ShipmentTracking | undefined): string[] {
  if (!tracking || (!tracking.carrier && !tracking.number && !tracking.url)) return [];
  const lines: string[] = [];
  if (tracking.carrier) lines.push(`Carrier: ${tracking.carrier}`);
  if (tracking.number) lines.push(`Tracking number: ${tracking.number}`);
  if (tracking.url) lines.push(`Track your package: ${tracking.url}`);
  return [...lines, ""];
}

export function shipmentNotificationEmail(input: ShipmentNotificationEmailInput): EmailContent {
  const { kind, orderNumber, tracking, trackUrl } = input;
  const { subjectPhrase, heading, body } = introFor(kind);
  const subject = `Your Pinprint order ${orderNumber} has ${subjectPhrase}`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f4f1ec; font-family:Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 24px 40px; text-align:center; color:#1a1a1a;">
                <h1 style="margin:0 0 8px 0; font-size:22px; font-weight:normal; color:#1a1a1a;">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 16px 0; font-size:14px; color:#6b6b6b;">Order ${escapeHtml(orderNumber)}</p>
                <p style="margin:0; font-size:16px; line-height:1.6; color:#3a3a3a;">
                  ${escapeHtml(body)}
                </p>
              </td>
            </tr>
            ${trackingLinesHtml(tracking)}
            ${
              trackUrl
                ? `<tr>
              <td align="center" style="padding:8px 40px 40px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#1a1a1a; border-radius:4px;">
                      <a href="${escapeHtml(trackUrl)}" style="display:inline-block; padding:14px 32px; font-size:15px; color:#ffffff; text-decoration:none; letter-spacing:0.02em;">
                        View your order
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
    heading,
    `Order ${orderNumber}`,
    "",
    body,
    "",
    ...trackingLinesText(tracking),
    ...(trackUrl ? [`View your order: ${trackUrl}`] : []),
  ].join("\n");

  return { subject, html, text };
}

import { escapeHtml } from "./leadMagnet.js";

// Pure email template — no I/O. Post-payment delivery for the digital tier:
// either the purchase itself (posterConfig.format === "digital") or the free
// digital files bundled with every print order. Table-based HTML with inline
// styles only (email-client-safe baseline), same shape as leadMagnet.ts.
//
// Unlike the lead-magnet's screen-res freebie, this IS the full-resolution
// product — the PNG here is explicitly labelled "full-resolution" (no ban on
// that phrasing in this template).

export type DigitalDeliveryItem = {
  /** Order-item label, e.g. "16 × 24 in Vintage Cartography — Melbourne". */
  label: string;
  /** Signed URL to the full-resolution print-ready PNG, or null if missing. */
  pngUrl: string | null;
  /** Signed URL to the vector SVG source, or null if not generated/missing. */
  svgUrl: string | null;
};

export type DigitalDeliveryEmailInput = {
  items: DigitalDeliveryItem[];
  /** True when at least one item was bought as the standalone digital format;
   * false when every item is a print and the digital files are the bundled
   * freebie — this flips the framing copy. */
  isDigitalOrder: boolean;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const LINK_VALIDITY_NOTE = "These links are valid for 30 days — save your files before then.";

function introFor(isDigitalOrder: boolean): { heading: string; body: string } {
  if (isDigitalOrder) {
    return {
      heading: "Your files are ready",
      body: "Thanks for your order — your digital design files are ready to download below.",
    };
  }
  return {
    heading: "Your digital files are included, free",
    body: "Your print is being prepared — and as a bonus, the digital files for your design are included free with your print. Download them below.",
  };
}

function itemRowHtml(item: DigitalDeliveryItem): string {
  const safeLabel = escapeHtml(item.label);
  const links: string[] = [];
  if (item.pngUrl) {
    const safePng = escapeHtml(item.pngUrl);
    links.push(
      `<a href="${safePng}" style="color:#1a1a1a; text-decoration:underline;">PNG — full-resolution, for screens and printing</a>`,
    );
  }
  if (item.svgUrl) {
    const safeSvg = escapeHtml(item.svgUrl);
    links.push(
      `<a href="${safeSvg}" style="color:#1a1a1a; text-decoration:underline;">SVG — vector source</a>`,
    );
  }
  return `
            <tr>
              <td style="padding:0 40px 20px 40px;">
                <p style="margin:0 0 8px 0; font-size:15px; color:#1a1a1a; font-weight:bold;">${safeLabel}</p>
                <p style="margin:0; font-size:14px; line-height:1.8; color:#3a3a3a;">
                  ${links.join(" &nbsp;|&nbsp; ")}
                </p>
              </td>
            </tr>`;
}

function itemBlockText(item: DigitalDeliveryItem): string {
  const lines = [item.label];
  if (item.pngUrl) lines.push(`  PNG — full-resolution, for screens and printing: ${item.pngUrl}`);
  if (item.svgUrl) lines.push(`  SVG — vector source: ${item.svgUrl}`);
  return lines.join("\n");
}

/**
 * The post-payment digital delivery email: signed links to each item's
 * full-resolution PNG and (where available) vector SVG. Framing flips between
 * "this is your purchase" and "this is free with your print" based on
 * `isDigitalOrder`.
 */
export function digitalDeliveryEmail(input: DigitalDeliveryEmailInput): EmailContent {
  const { items, isDigitalOrder } = input;
  const subject = "Your Pinprint files are ready";
  const { heading, body } = introFor(isDigitalOrder);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f4f1ec; font-family:Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 24px 40px; text-align:center; color:#1a1a1a;">
                <h1 style="margin:0 0 16px 0; font-size:22px; font-weight:normal; color:#1a1a1a;">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 20px 0; font-size:16px; line-height:1.6; color:#3a3a3a;">
                  ${escapeHtml(body)}
                </p>
              </td>
            </tr>
            ${items.map(itemRowHtml).join("\n")}
            <tr>
              <td style="padding:24px 40px 40px 40px; border-top:1px solid #eee; text-align:center; color:#6b6b6b;">
                <p style="margin:0; font-size:13px; line-height:1.7;">
                  ${escapeHtml(LINK_VALIDITY_NOTE)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    heading,
    "",
    body,
    "",
    ...items.flatMap((item) => [itemBlockText(item), ""]),
    LINK_VALIDITY_NOTE,
  ].join("\n");

  return { subject, html, text };
}

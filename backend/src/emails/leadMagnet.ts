// Pure email templates — no I/O, no dependency (no react-email), so they're
// trivial to unit test. HTML is table-based with inline styles only, the
// email-client-safe baseline (no <style> blocks, no flex/grid).

import { OFFERED_PRODUCT_IDS, PRINT_PRICE_CENTS } from "@pinprint/shared";

/** "from $65" — derived from the live catalogue so a reprice never strands this copy. */
const FROM_PRICE = `$${Math.min(...OFFERED_PRODUCT_IDS.map((id) => PRINT_PRICE_CENTS[id])) / 100}`;

export type LeadMagnetEmailInput = {
  /** Signed/public URL to the screen-res poster PNG. */
  downloadUrl: string;
  /** Human label for the design, e.g. "Vintage Cartography — Melbourne". */
  posterLabel: string;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Escape a value for interpolation into the HTML output only. `posterLabel`
 * and `downloadUrl` are user/request-derived (posterLabel from the poster
 * config, downloadUrl includes query params) — never trust them to be
 * markup-safe. The plain-text version has no injection surface and is left
 * as-is.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The free lead-magnet delivery email: a screen-res poster design, gated
 * behind an email address, with a soft upsell to the paid fine-art print.
 * Deliberately never says "high-resolution" / "high res" — the free file is
 * screen-res by design; the print is the upgrade.
 */
export function leadMagnetEmail(input: LeadMagnetEmailInput): EmailContent {
  const { downloadUrl, posterLabel } = input;

  const subject = "Your free Pinprint design is ready";

  const safePosterLabel = escapeHtml(posterLabel);
  const safeDownloadUrl = escapeHtml(downloadUrl);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f4f1ec; font-family:Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 24px 40px; text-align:center; color:#1a1a1a;">
                <h1 style="margin:0 0 16px 0; font-size:22px; font-weight:normal; color:#1a1a1a;">Your design is ready</h1>
                <p style="margin:0 0 20px 0; font-size:16px; line-height:1.6; color:#3a3a3a;">
                  Hi there — your custom design, <strong>${safePosterLabel}</strong>, is ready. Tap the
                  button below and it's yours to download.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 28px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#1a1a1a; border-radius:4px;">
                      <a href="${safeDownloadUrl}" style="display:inline-block; padding:14px 32px; font-size:15px; color:#ffffff; text-decoration:none; letter-spacing:0.02em;">
                        Download your design
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px; text-align:center; color:#3a3a3a;">
                <p style="margin:0; font-size:14px; line-height:1.6;">
                  It's sized to look sharp as a phone or desktop wallpaper — save it and set it as your background any time.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 40px 40px; border-top:1px solid #eee; text-align:center; color:#6b6b6b;">
                <p style="margin:0; font-size:13px; line-height:1.7;">
                  Love how it looks on screen? This exact design can be printed museum-quality on
                  archival fine-art paper and shipped to your door — loose prints start at ${FROM_PRICE},
                  with free shipping. Just reply to this email if you'd like one.
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
    "Your design is ready",
    "",
    `Hi there — your custom design, ${posterLabel}, is ready.`,
    "",
    `Download your design: ${downloadUrl}`,
    "",
    "It's sized to look sharp as a phone or desktop wallpaper — save it and set it as your background any time.",
    "",
    "Love how it looks on screen? This exact design can be printed museum-quality on archival",
    `fine-art paper and shipped to your door — loose prints start at ${FROM_PRICE}, with free shipping.`,
    "Just reply to this email if you'd like one.",
  ].join("\n");

  return { subject, html, text };
}

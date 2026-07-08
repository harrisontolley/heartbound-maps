import type { CoordinateStory } from "./coordinateStory.js";
import { escapeHtml } from "./leadMagnet.js";

// Pure email template — no I/O. Post-payment delivery for the digital tier:
// either the purchase itself (posterConfig.format === "digital") or the free
// digital files bundled with every print order. Table-based HTML with inline
// styles only (email-client-safe baseline), same shape as leadMagnet.ts.
//
// Unlike the lead-magnet's screen-res freebie, this IS the full-resolution
// product — the PNG here is explicitly labelled "full-resolution" (no ban on
// that phrasing in this template).
//
// Beyond the core PNG/SVG deliverable, each item can carry two independent
// bonuses (see PosterStudio.tsx's addToCart, which uploads both best-effort):
// a phone and desktop wallpaper render of the buyer's exact design ("Your
// bonuses"), and a coordinate story built server-side from the stored
// poster_config (coordinateStory.ts) — every place, its affiliation, its
// compass bearing, and its real distance from home, written out in prose.
// Both are rendered only when present; an order missing either (a failed
// upload, or a legacy/malformed poster_config) simply renders fewer sections,
// never a broken link or an empty heading.

export type DigitalDeliveryItem = {
  /** Order-item label, e.g. "16 x 24 in Vintage Cartography, Melbourne". */
  label: string;
  /** Signed URL to the full-resolution print-ready PNG, or null if missing. */
  pngUrl: string | null;
  /** Signed URL to the vector SVG source, or null if not generated/missing. */
  svgUrl: string | null;
  /** Signed URL to the bonus phone wallpaper PNG (9:16), or null if absent. */
  phoneWallpaperUrl: string | null;
  /** Signed URL to the bonus desktop wallpaper PNG (16:9), or null if absent. */
  desktopWallpaperUrl: string | null;
  /** The coordinate story for this item's design, or null if unavailable. */
  story: CoordinateStory | null;
};

export type DigitalDeliveryEmailInput = {
  items: DigitalDeliveryItem[];
  /** True when at least one item was bought as the standalone digital format;
   * false when every item is a print and the digital files are the bundled
   * freebie — this flips the framing copy. */
  isDigitalOrder: boolean;
  /** Absolute URL to the static hanging/care guide, or null to omit the link
   * (e.g. the frontend origin isn't configured yet) rather than ship a
   * broken href. */
  hangingGuideUrl: string | null;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const LINK_VALIDITY_NOTE = "These links are valid for 30 days. Save your files before then.";
const HANGING_GUIDE_NOTE = "Once it arrives, our hanging and care guide covers height, wall placement, and framing.";

function introFor(isDigitalOrder: boolean): { heading: string; body: string } {
  if (isDigitalOrder) {
    return {
      heading: "Your files are ready",
      body: "Thanks for your order. Your digital design files are ready to download below.",
    };
  }
  return {
    heading: "Your digital files are included, free",
    body: "Your print is being prepared, and as a bonus, the digital files for your design are included free with your print. Download them below.",
  };
}

function itemRowHtml(item: DigitalDeliveryItem): string {
  const safeLabel = escapeHtml(item.label);
  const links: string[] = [];
  if (item.pngUrl) {
    const safePng = escapeHtml(item.pngUrl);
    links.push(
      `<a href="${safePng}" style="color:#1a1a1a; text-decoration:underline;">PNG (full-resolution, for screens and printing)</a>`,
    );
  }
  if (item.svgUrl) {
    const safeSvg = escapeHtml(item.svgUrl);
    links.push(
      `<a href="${safeSvg}" style="color:#1a1a1a; text-decoration:underline;">SVG (vector source)</a>`,
    );
  }
  const bonusLinks: string[] = [];
  if (item.phoneWallpaperUrl) {
    const safeUrl = escapeHtml(item.phoneWallpaperUrl);
    bonusLinks.push(
      `<a href="${safeUrl}" style="color:#1a1a1a; text-decoration:underline;">Phone wallpaper</a>`,
    );
  }
  if (item.desktopWallpaperUrl) {
    const safeUrl = escapeHtml(item.desktopWallpaperUrl);
    bonusLinks.push(
      `<a href="${safeUrl}" style="color:#1a1a1a; text-decoration:underline;">Desktop wallpaper</a>`,
    );
  }

  const bonusHtml = bonusLinks.length
    ? `
                <p style="margin:12px 0 0 0; font-size:12px; letter-spacing:0.04em; text-transform:uppercase; color:#6b6b6b;">Your bonuses</p>
                <p style="margin:4px 0 0 0; font-size:14px; line-height:1.8; color:#3a3a3a;">
                  ${bonusLinks.join(" &nbsp;|&nbsp; ")}
                </p>`
    : "";

  const storyHtml = item.story ? storySectionHtml(item.story) : "";

  return `
            <tr>
              <td style="padding:0 40px 20px 40px;">
                <p style="margin:0 0 8px 0; font-size:15px; color:#1a1a1a; font-weight:bold;">${safeLabel}</p>
                <p style="margin:0; font-size:14px; line-height:1.8; color:#3a3a3a;">
                  ${links.join(" &nbsp;|&nbsp; ")}
                </p>${bonusHtml}${storyHtml}
              </td>
            </tr>`;
}

function storySectionHtml(story: CoordinateStory): string {
  const rows = story.places
    .map((p) => `<li style="margin:0 0 6px 0;">${escapeHtml(p.sentence)}</li>`)
    .join("\n");
  return `
                <p style="margin:16px 0 4px 0; font-size:15px; color:#1a1a1a; font-weight:bold;">The story behind your coordinates</p>
                <ul style="margin:0; padding-left:18px; font-size:14px; line-height:1.6; color:#3a3a3a;">
                  ${rows}
                </ul>`;
}

function itemBlockText(item: DigitalDeliveryItem): string {
  const lines = [item.label];
  if (item.pngUrl) lines.push(`  PNG (full-resolution, for screens and printing): ${item.pngUrl}`);
  if (item.svgUrl) lines.push(`  SVG (vector source): ${item.svgUrl}`);
  if (item.phoneWallpaperUrl || item.desktopWallpaperUrl) {
    lines.push("  Your bonuses:");
    if (item.phoneWallpaperUrl) lines.push(`    Phone wallpaper: ${item.phoneWallpaperUrl}`);
    if (item.desktopWallpaperUrl) lines.push(`    Desktop wallpaper: ${item.desktopWallpaperUrl}`);
  }
  if (item.story) {
    lines.push("  The story behind your coordinates:");
    for (const p of item.story.places) lines.push(`    ${p.sentence}`);
  }
  return lines.join("\n");
}

/**
 * The post-payment digital delivery email: signed links to each item's
 * full-resolution PNG and (where available) vector SVG, plus the bonus
 * wallpaper renders and coordinate story when present, and a link to the
 * hanging/care guide. Framing flips between "this is your purchase" and
 * "this is free with your print" based on `isDigitalOrder`.
 */
export function digitalDeliveryEmail(input: DigitalDeliveryEmailInput): EmailContent {
  const { items, isDigitalOrder, hangingGuideUrl } = input;
  const subject = "Your Heartbound Maps files are ready";
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
                ${
                  hangingGuideUrl
                    ? `<p style="margin:0 0 12px 0; font-size:13px; line-height:1.7;">
                  <a href="${escapeHtml(hangingGuideUrl)}" style="color:#1a1a1a; text-decoration:underline;">${escapeHtml(HANGING_GUIDE_NOTE)}</a>
                </p>`
                    : ""
                }
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
    ...(hangingGuideUrl ? [HANGING_GUIDE_NOTE, hangingGuideUrl, ""] : []),
    LINK_VALIDITY_NOTE,
  ].join("\n");

  return { subject, html, text };
}

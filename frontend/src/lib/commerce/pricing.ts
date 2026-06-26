// Central, tunable money for the studio offer. Integer USD cents (Stripe
// convention) so there's no float drift. Kept import-free so it never forms a
// cycle with printProducts/price.
//
// Retail is set for premium-gift positioning (~70-77% gross vs our fulfilment
// cost on the 2:3 portrait ladder); the ready-to-hang frame is the AOV upsell,
// and the digital file is a low-CAC tripwire that's also bundled free with any
// print. Edit here to reprice — these are the single source of truth.

/** Print retail by product id (the surfaced 2:3 portrait ladder). */
export const PRINT_PRICE_CENTS: Record<string, number> = {
  "portrait-12x18": 3900, // good
  "portrait-16x24": 5900, // popular / hero
  "portrait-24x36": 8900, // premium anchor
};

/** Ready-to-hang frame upcharge by product id (added on top of the print). */
export const FRAME_UPCHARGE_CENTS: Record<string, number> = {
  "portrait-12x18": 4000,
  "portrait-16x24": 5500,
  "portrait-24x36": 7000,
};

/** Standalone digital download — also included free with any print. */
export const DIGITAL_PRICE_CENTS = 1200;

/** Frame upcharge fallback for sizes we keep but don't currently surface. */
export const DEFAULT_FRAME_UPCHARGE_CENTS = 5500;

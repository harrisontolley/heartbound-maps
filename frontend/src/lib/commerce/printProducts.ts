// The poster sizes a customer can buy, framed as real US print products (inches +
// price) rather than abstract ratios. Money lives in ./pricing (the single
// tunable source); this module is the single source of truth for what the SIZE
// picker and the buy bar show.
//
// Each product carries the SVG viewBox the poster renders into. We reuse the
// proven (w,h) pairs from templates/sizes.ts so the layout engine + PNG/SVG
// export keep working untouched, and every print size's inches match its viewBox
// ratio exactly (portrait 2:3, square 1:1, landscape 3:2) — no crop/letterbox.
//
// We keep every orientation in PRINT_PRODUCTS (data-model flexibility), but the
// studio surfaces only OFFERED_PRODUCTS — the curated 2:3 portrait ladder.

import { POSTER_SIZES } from "../templates/sizes";
import {
  PRINT_PRICE_CENTS,
  FRAME_UPCHARGE_CENTS,
  DEFAULT_FRAME_UPCHARGE_CENTS,
} from "./pricing";

export type Orientation = "portrait" | "square" | "landscape";

export type PrintProduct = {
  id: string;
  orientation: Orientation;
  /** Display label, e.g. "16 × 24 in". */
  label: string;
  widthIn: number;
  heightIn: number;
  /** SVG viewBox the poster renders into (drives layout + export). */
  viewBox: { w: number; h: number };
  /** Retail price in integer USD cents. */
  priceCents: number;
  /** Ready-to-hang frame upcharge, added on top of priceCents. */
  frameUpchargeCents: number;
  popular?: boolean;
  /** Optional badge shown on the size card (e.g. "Premium"). */
  badge?: string;
};

/** viewBox per orientation, reusing the engine's existing ratios. */
const VIEWBOX: Record<Orientation, { w: number; h: number }> = {
  portrait: { w: POSTER_SIZES.portrait.width, h: POSTER_SIZES.portrait.height }, // 2:3
  square: { w: POSTER_SIZES.square.width, h: POSTER_SIZES.square.height }, //       1:1
  landscape: { w: POSTER_SIZES.landscape.width, h: POSTER_SIZES.landscape.height }, // 3:2
};

function product(
  orientation: Orientation,
  widthIn: number,
  heightIn: number,
  opts: { priceCents?: number; popular?: boolean; badge?: string } = {},
): PrintProduct {
  const id = `${orientation}-${widthIn}x${heightIn}`;
  return {
    id,
    orientation,
    label: `${widthIn} × ${heightIn} in`,
    widthIn,
    heightIn,
    viewBox: VIEWBOX[orientation],
    priceCents: opts.priceCents ?? PRINT_PRICE_CENTS[id] ?? 0,
    frameUpchargeCents: FRAME_UPCHARGE_CENTS[id] ?? DEFAULT_FRAME_UPCHARGE_CENTS,
    popular: opts.popular,
    badge: opts.badge,
  };
}

export const PRINT_PRODUCTS: PrintProduct[] = [
  // Portrait — 2:3 (the offered ladder; prices + frame from ./pricing)
  product("portrait", 12, 18),
  product("portrait", 16, 24, { popular: true }),
  product("portrait", 24, 36, { badge: "Premium" }),
  // Square — 1:1 (kept for data-model flexibility + tests; not surfaced)
  product("square", 12, 12, { priceCents: 2900 }),
  product("square", 20, 20, { priceCents: 4900 }),
  // Landscape — 3:2 (kept; not surfaced)
  product("landscape", 24, 16, { priceCents: 4900 }),
  product("landscape", 36, 24, { priceCents: 6900 }),
];

export const ORIENTATION_ORDER: Orientation[] = [
  "portrait",
  "square",
  "landscape",
];

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: "Portrait",
  square: "Square",
  landscape: "Landscape",
};

export const PRODUCTS_BY_ID: Record<string, PrintProduct> = Object.fromEntries(
  PRINT_PRODUCTS.map((p) => [p.id, p]),
);

export const DEFAULT_PRODUCT_ID = "portrait-16x24";

/**
 * The curated set the studio actually offers: the 2:3 portrait ladder, in
 * good → better → best order. (Square/landscape stay in PRINT_PRODUCTS for
 * flexibility but aren't surfaced.)
 */
export const OFFERED_PRODUCT_IDS = [
  "portrait-12x18",
  "portrait-16x24",
  "portrait-24x36",
] as const;

export const OFFERED_PRODUCTS: PrintProduct[] = OFFERED_PRODUCT_IDS.map(
  (id) => PRODUCTS_BY_ID[id],
);

/** Products for one orientation, in declaration order. */
export function productsByOrientation(o: Orientation): PrintProduct[] {
  return PRINT_PRODUCTS.filter((p) => p.orientation === o);
}

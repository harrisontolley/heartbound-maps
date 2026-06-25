// The poster sizes a customer can buy, framed as real US print products (inches +
// price) rather than abstract ratios. Prices are placeholder integer cents until
// the Stripe/Prodigi pricing lands — see docs/integrations. This module is the
// single source of truth for what the SIZE picker and the buy bar show.
//
// Each product carries the SVG viewBox the poster renders into. We reuse the
// proven (w,h) pairs from templates/sizes.ts so the layout engine + PNG/SVG
// export keep working untouched, and every print size's inches match its viewBox
// ratio exactly (portrait 2:3, square 1:1, landscape 3:2) — no crop/letterbox.

import { POSTER_SIZES } from "../templates/sizes";

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
  /** Placeholder price in integer USD cents. */
  priceCents: number;
  popular?: boolean;
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
  priceCents: number,
  popular = false,
): PrintProduct {
  return {
    id: `${orientation}-${widthIn}x${heightIn}`,
    orientation,
    label: `${widthIn} × ${heightIn} in`,
    widthIn,
    heightIn,
    viewBox: VIEWBOX[orientation],
    priceCents,
    popular,
  };
}

export const PRINT_PRODUCTS: PrintProduct[] = [
  // Portrait — 2:3
  product("portrait", 12, 18, 2900),
  product("portrait", 16, 24, 3900, true),
  product("portrait", 24, 36, 5900),
  // Square — 1:1
  product("square", 12, 12, 2900),
  product("square", 20, 20, 4900),
  // Landscape — 3:2
  product("landscape", 24, 16, 4900),
  product("landscape", 36, 24, 6900),
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

/** Products for one orientation, in declaration order. */
export function productsByOrientation(o: Orientation): PrintProduct[] {
  return PRINT_PRODUCTS.filter((p) => p.orientation === o);
}

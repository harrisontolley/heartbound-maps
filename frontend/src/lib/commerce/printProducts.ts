// The poster sizes a customer can buy. The numeric catalogue (ids, sizes, prices,
// frame upcharges) is the single source of truth in @heartbound/shared so the
// backend can price checkout authoritatively. This module is the FRONTEND adapter
// that layers on the rendering-only SVG `viewBox` (reusing the engine's proven
// (w,h) ratios from templates/sizes.ts) and re-exports the catalogue helpers the
// SIZE picker and buy bar use.

import { POSTER_SIZES } from "../templates/sizes";
import {
  PRINT_PRODUCTS_BASE,
  OFFERED_PRODUCT_IDS,
  type Orientation,
  type ProductBase,
} from "@heartbound/shared";

export type { Orientation } from "@heartbound/shared";
export {
  ORIENTATION_ORDER,
  ORIENTATION_LABELS,
  DEFAULT_PRODUCT_ID,
  OFFERED_PRODUCT_IDS,
} from "@heartbound/shared";

/** A catalogue product enriched with the SVG viewBox the poster renders into. */
export type PrintProduct = ProductBase & {
  /** SVG viewBox the poster renders into (drives layout + export). */
  viewBox: { w: number; h: number };
};

/** viewBox per orientation, reusing the engine's existing ratios. */
const VIEWBOX: Record<Orientation, { w: number; h: number }> = {
  portrait: { w: POSTER_SIZES.portrait.width, h: POSTER_SIZES.portrait.height }, // 2:3
  square: { w: POSTER_SIZES.square.width, h: POSTER_SIZES.square.height }, //       1:1
  landscape: { w: POSTER_SIZES.landscape.width, h: POSTER_SIZES.landscape.height }, // 3:2
};

function withViewBox(base: ProductBase): PrintProduct {
  return { ...base, viewBox: VIEWBOX[base.orientation] };
}

export const PRINT_PRODUCTS: PrintProduct[] = PRINT_PRODUCTS_BASE.map(withViewBox);

export const PRODUCTS_BY_ID: Record<string, PrintProduct> = Object.fromEntries(
  PRINT_PRODUCTS.map((p) => [p.id, p]),
);

export const OFFERED_PRODUCTS: PrintProduct[] = OFFERED_PRODUCT_IDS.map(
  (id) => PRODUCTS_BY_ID[id],
);

/** Products for one orientation, in declaration order. */
export function productsByOrientation(o: Orientation): PrintProduct[] {
  return PRINT_PRODUCTS.filter((p) => p.orientation === o);
}

// Pinprint's own facts, derived from the canonical commerce catalogue so the
// comparison pages never hardcode a price that can drift out of sync. Import these
// wherever a comparison cell needs an exact Pinprint figure; a test asserts they
// track the shared source (see competitors.test.ts).

import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { formatUsd } from "@/lib/commerce/price";
import { DIGITAL_PRICE_CENTS } from "@pinprint/shared";

const small = OFFERED_PRODUCTS[0];
const large = OFFERED_PRODUCTS[OFFERED_PRODUCTS.length - 1];

export type PinprintPrintFact = {
  /** e.g. "16 × 24 in". */
  size: string;
  /** Charged loose-print price, e.g. "$59.00". */
  price: string;
  /** Loose price + ready-to-hang frame, e.g. "$119.00". */
  framedPrice: string;
};

/** The three offered sizes, formatted. */
export const PINPRINT_PRINTS: readonly PinprintPrintFact[] = OFFERED_PRODUCTS.map(
  (p) => ({
    size: p.label,
    price: formatUsd(p.priceCents),
    framedPrice: formatUsd(p.priceCents + p.frameUpchargeCents),
  }),
);

export const PINPRINT_FACTS = {
  prints: PINPRINT_PRINTS,
  /** e.g. "$45.00–$95.00". */
  priceRange: `${formatUsd(small.priceCents)}–${formatUsd(large.priceCents)}`,
  /** Framed range, e.g. "$95.00–$195.00". */
  framedRange: `${formatUsd(
    small.priceCents + small.frameUpchargeCents,
  )}–${formatUsd(large.priceCents + large.frameUpchargeCents)}`,
  /** Standalone digital download, e.g. "$19.00" (also free with any print). */
  digitalPrice: formatUsd(DIGITAL_PRICE_CENTS),
  /** e.g. "12 × 18 in to 24 × 36 in". */
  sizeRange: `${small.label} to ${large.label}`,
} as const;

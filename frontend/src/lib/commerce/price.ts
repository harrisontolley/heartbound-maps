// USD money formatting + selection pricing for the studio's buy flow. Prices are
// stored as integer cents (Stripe convention) so there's no float drift; this is
// the single place that turns them into display strings and totals a selection.

import type { PrintProduct } from "./printProducts";
import { DIGITAL_PRICE_CENTS } from "./pricing";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as a US dollar string, e.g. 3900 → "$39.00". */
export function formatUsd(cents: number): string {
  return USD.format(cents / 100);
}

export type StudioFormat = "print" | "digital";

export type StudioLineItem = { label: string; cents: number };

/** A full snapshot of what the buyer is about to add — the cart seam's input. */
export type StudioSelection = {
  format: StudioFormat;
  productId: string;
  size: { label: string; widthIn: number; heightIn: number };
  addFrame: boolean;
  totalCents: number;
  lineItems: StudioLineItem[];
};

type PriceInput = {
  format: StudioFormat;
  product: PrintProduct;
  addFrame: boolean;
};

/** Total in cents: digital is flat; a print adds the frame upcharge when on. */
export function selectionTotalCents({
  format,
  product,
  addFrame,
}: PriceInput): number {
  if (format === "digital") return DIGITAL_PRICE_CENTS;
  return product.priceCents + (addFrame ? product.frameUpchargeCents : 0);
}

/** Line items for the buy-bar breakdown. A 0-cent item renders as "Free". */
export function selectionLineItems({
  format,
  product,
  addFrame,
}: PriceInput): StudioLineItem[] {
  if (format === "digital") {
    return [{ label: "Digital download", cents: DIGITAL_PRICE_CENTS }];
  }
  return [
    { label: `${product.label} print`, cents: product.priceCents },
    ...(addFrame
      ? [{ label: "Ready-to-hang frame", cents: product.frameUpchargeCents }]
      : []),
    // Bundled free with every print.
    { label: "Digital download", cents: 0 },
  ];
}

/** Assemble the immutable selection for the cart seam (frame forced off on digital). */
export function buildSelection({
  format,
  product,
  addFrame,
}: PriceInput): StudioSelection {
  const effectiveFrame = format === "print" && addFrame;
  const input = { format, product, addFrame: effectiveFrame };
  return {
    format,
    productId: product.id,
    size: {
      label: product.label,
      widthIn: product.widthIn,
      heightIn: product.heightIn,
    },
    addFrame: effectiveFrame,
    totalCents: selectionTotalCents(input),
    lineItems: selectionLineItems(input),
  };
}

// Commerce: the product catalogue, pricing, and checkout wire contracts. This is
// the single source of truth that both the studio (frontend) and the checkout
// (backend) read, so prices can be recomputed server-side and never trusted from
// the client. Money is integer USD cents (Stripe convention) — no float drift.
//
// The numeric catalogue lives here; the frontend layers the rendering-only SVG
// `viewBox` on top (see frontend/src/lib/commerce/printProducts.ts), which is why
// this module is free of any rendering/template dependency.

import type { OrderStatus } from "./orders.js";

// ── Tunable money (the single place to reprice) ──────────────────────────────

/** Print retail by product id (the surfaced 2:3 portrait ladder). */
export const PRINT_PRICE_CENTS: Record<string, number> = {
  "portrait-12x18": 6100, // German Etching COGS $27.21 → ~55% margin
  "portrait-16x24": 9100, // German Etching COGS $41.14 → ~55% margin
  "portrait-24x36": 16500, // German Etching COGS $74.14 → ~55% margin
};

/**
 * Anchor ("regular") price by product id, shown struck-through next to the
 * charged price above. The custom-map-poster category (Mapiful, Grafomap,
 * Positive Prints, …) sells against a permanent "Save ~25%" discount, so we
 * anchor each list price ≈ charged ÷ 0.75 (clean round number) and charge the
 * sale price. This is display-only: the price actually charged is always
 * PRINT_PRICE_CENTS — there is no Stripe coupon and the server re-derives the
 * sale price (see selectionTotalCents). A list ≤ charged ⇒ no badge.
 */
export const LIST_PRICE_CENTS: Record<string, number> = {
  "portrait-12x18": 8200, // 25% off $61 (true 25.6%, floored to 25)
  "portrait-16x24": 12200, // 25% off $91 (true 25.4%, floored to 25)
  "portrait-24x36": 22000, // 25% off $165 (true 25.0%, floored to 25)
};

/**
 * Ready-to-hang premium frame upcharge by product id (added on top of the print).
 * Framed prints use 300gsm 100% cotton-rag Hot Press paper (HotPressFineArt) — a
 * different, smooth stock from the textured German Etching used for loose prints —
 * in a premium natural-oak ready-to-hang frame (PremiumOak/NaturalOak, framing
 * service on). Framed Artelo landed COGS (production + US shipping, verified
 * 2026-07-01): 12×18 $49.47 / 16×24 $67.88 / 24×36 $115.98.
 * Upcharges are set so framed totals (base + upcharge) stay at $125 / $169 / $289
 * at ~60% margin even as the loose base price rose for German Etching.
 */
export const FRAME_UPCHARGE_CENTS: Record<string, number> = {
  "portrait-12x18": 6400, // framed total $125 (~60% margin)
  "portrait-16x24": 7800, // framed total $169 (~60% margin)
  "portrait-24x36": 12400, // framed total $289 (~60% margin)
};

/** Standalone digital download — also included free with any print. */
export const DIGITAL_PRICE_CENTS = 1900;

/** Anchor ("regular") price for the digital download — display-only strike-through. */
export const DIGITAL_LIST_PRICE_CENTS = 2500;

/** Frame upcharge fallback for sizes we keep but don't currently surface. */
export const DEFAULT_FRAME_UPCHARGE_CENTS = 6000;

/**
 * Shipping policy: free standard shipping on every order, no threshold. The
 * per-size Artelo COGS already include US shipping, so margins (~55–60%) absorb
 * it, and most orders are a single print (a threshold would only add friction).
 * Checkout charges $0 shipping (`shippingCents: 0`); this flag single-sources the
 * customer-facing "Free shipping" copy so the policy lives in one place.
 */
export const FREE_SHIPPING = true;

// ── Catalogue (numeric base, no viewBox) ─────────────────────────────────────

export type Orientation = "portrait" | "square" | "landscape";

/**
 * A buyable print product, framed as a real US size (inches + price). The
 * frontend extends this with the SVG `viewBox` it renders into.
 */
export type ProductBase = {
  id: string;
  orientation: Orientation;
  /** Display label, e.g. "16 × 24 in". */
  label: string;
  widthIn: number;
  heightIn: number;
  /** Retail price in integer USD cents (the price actually charged). */
  priceCents: number;
  /**
   * Anchor ("regular") price in integer USD cents, shown struck-through. Equals
   * priceCents when there's no discount to display.
   */
  listPriceCents: number;
  /** Ready-to-hang frame upcharge, added on top of priceCents. */
  frameUpchargeCents: number;
  popular?: boolean;
  /** Optional badge shown on the size card (e.g. "Premium"). */
  badge?: string;
};

function product(
  orientation: Orientation,
  widthIn: number,
  heightIn: number,
  opts: {
    priceCents?: number;
    listPriceCents?: number;
    popular?: boolean;
    badge?: string;
  } = {},
): ProductBase {
  const id = `${orientation}-${widthIn}x${heightIn}`;
  const priceCents = opts.priceCents ?? PRINT_PRICE_CENTS[id] ?? 0;
  return {
    id,
    orientation,
    label: `${widthIn} × ${heightIn} in`,
    widthIn,
    heightIn,
    priceCents,
    // Fall back to the sale price for sizes without an anchor ⇒ no discount shown.
    listPriceCents: opts.listPriceCents ?? LIST_PRICE_CENTS[id] ?? priceCents,
    frameUpchargeCents: FRAME_UPCHARGE_CENTS[id] ?? DEFAULT_FRAME_UPCHARGE_CENTS,
    popular: opts.popular,
    badge: opts.badge,
  };
}

/**
 * Whole-percent discount of a sale price against its anchor, e.g.
 * (7900, 5900) → 25. Returns 0 when there's nothing to advertise (list ≤ price).
 *
 * Floored, never rounded: the advertised number must never overstate the real
 * saving (a true 25.3% off shows "25%", a true 24.6% shows "24%", not "25%").
 */
export function discountPercent(listCents: number, priceCents: number): number {
  if (listCents <= priceCents) return 0;
  return Math.floor(((listCents - priceCents) / listCents) * 100);
}

export const PRINT_PRODUCTS_BASE: ProductBase[] = [
  // Portrait — 2:3 (the offered ladder; prices + frame from the maps above)
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

export const PRODUCTS_BASE_BY_ID: Record<string, ProductBase> =
  Object.fromEntries(PRINT_PRODUCTS_BASE.map((p) => [p.id, p]));

export const DEFAULT_PRODUCT_ID = "portrait-16x24";

/**
 * The curated set the studio actually offers: the 2:3 portrait ladder, in
 * good → better → best order.
 */
export const OFFERED_PRODUCT_IDS = [
  "portrait-12x18",
  "portrait-16x24",
  "portrait-24x36",
] as const;

// ── Artelo fulfilment mapping ────────────────────────────────────────────────
//
// Artelo orders don't reference a SKU — each line item carries a `productInfo`
// object describing the print (catalog product + paper + frame + size +
// orientation). This table maps our internal productId to those attributes so
// the backend can build an Artelo create-order body. It's the single place to
// retune paper/frame.
//
// Enum strings below are confirmed against the live Artelo validator
// (POST /catalog/get-costs and /orders/create) — see docs/integrations/artelo.md.
//   size       : "x12x18" | "x16x24" | "x24x36" (leading-`x` WxH inches)
//   paperType  : "GermanEtchingFineArt" for loose (Hahnemühle 310gsm, textured)
//                "HotPressFineArt" for framed (300gsm cotton rag, smooth behind glass)
//                (the Poster/Photo/…FineArt lines all exist — this is the single place to retune)
//   frameStyle : "Unframed" | "Oak" | "Metal" | "PremiumOak" | "PremiumMetal"
//   frameColor : "Unframed" | "{Natural,Black,White,Walnut}Oak" | "{White,Black,Silver,Gold}Metal" (+ Premium*)
// Loose: German Etching 310gsm. Framed: cotton rag 300gsm + premium natural oak.
// Single place to retune.

export type ArteloOrientation = "Vertical" | "Horizontal";

export type ArteloFrameSpec = {
  frameColor: string;
  frameStyle: string;
};

export type ArteloProductSpec = {
  /** Artelo catalog product enum. */
  catalogProductId: "IndividualArtPrint";
  /** Artelo paperType for a loose (unframed) print, e.g. "GermanEtchingFineArt". */
  paperType: string;
  /** Artelo paperType for a framed print (behind glass), e.g. "HotPressFineArt". */
  framedPaperType: string;
  /** Artelo size enum, e.g. "x12x18" (leading-`x` WxH form). */
  size: string;
  orientation: ArteloOrientation;
  /** Frame attributes used when the buyer adds the ready-to-hang frame. */
  frame: ArteloFrameSpec;
};

/** Frame applied to a framed order — a premium natural-oak ready-to-hang frame. */
const DEFAULT_FRAME: ArteloFrameSpec = {
  frameStyle: "PremiumOak",
  frameColor: "NaturalOak",
};

/** Artelo requires both fields even on unframed orders. */
const UNFRAMED: ArteloFrameSpec = {
  frameStyle: "Unframed",
  frameColor: "Unframed",
};

/**
 * Print substrates — deliberately different for loose vs framed:
 *  - Loose (unframed): Hahnemühle German Etching 310gsm (GermanEtchingFineArt) —
 *    a heavily textured, tactile artist's paper; the upmarket piece you hold.
 *  - Framed: 300gsm 100% cotton-rag Hot Press (HotPressFineArt) — a smooth fine-art
 *    paper that looks cleaner behind glass; adds a premium natural-oak ready-to-hang
 *    frame (DEFAULT_FRAME) and the Artelo framing service.
 * Both use archival pigment inks. Single place to retune.
 */
const LOOSE_PAPER_TYPE = "GermanEtchingFineArt";
const FRAMED_PAPER_TYPE = "HotPressFineArt";

/** productId → Artelo print spec (the offered 2:3 portrait ladder). */
export const ARTELO_PRODUCT_BY_ID: Record<string, ArteloProductSpec> = {
  "portrait-12x18": {
    catalogProductId: "IndividualArtPrint",
    paperType: LOOSE_PAPER_TYPE,
    framedPaperType: FRAMED_PAPER_TYPE,
    size: "x12x18",
    orientation: "Vertical",
    frame: DEFAULT_FRAME,
  },
  "portrait-16x24": {
    catalogProductId: "IndividualArtPrint",
    paperType: LOOSE_PAPER_TYPE,
    framedPaperType: FRAMED_PAPER_TYPE,
    size: "x16x24",
    orientation: "Vertical",
    frame: DEFAULT_FRAME,
  },
  "portrait-24x36": {
    catalogProductId: "IndividualArtPrint",
    paperType: LOOSE_PAPER_TYPE,
    framedPaperType: FRAMED_PAPER_TYPE,
    size: "x24x36",
    orientation: "Vertical",
    frame: DEFAULT_FRAME,
  },
};

/** The `productInfo` shape an Artelo order line item carries (sans designs). */
export type ArteloProductInfo = {
  catalogProductId: "IndividualArtPrint";
  paperType: string;
  size: string;
  orientation: ArteloOrientation;
  includeFramingService: boolean;
  includeMats: boolean;
  includeHangingPins: boolean;
  /** Always present — Artelo requires both even when unframed ("Unframed"). */
  frameStyle: string;
  frameColor: string;
};

/**
 * Build the Artelo `productInfo` (minus the design/image) for a product id.
 * Returns null for products we don't fulfil through Artelo. When `addFrame` is
 * set, the frame attributes + framing service are included and the print runs on
 * the framed paper (HotPressFineArt, 300gsm cotton rag — smooth behind glass);
 * otherwise the frame fields are "Unframed" (required by Artelo's schema) and the
 * print runs on the loose paper (GermanEtchingFineArt, Hahnemühle 310gsm, textured).
 */
export function arteloProductInfoFor(
  productId: string,
  addFrame: boolean,
): ArteloProductInfo | null {
  const spec = ARTELO_PRODUCT_BY_ID[productId];
  if (!spec) return null;
  const frame = addFrame ? spec.frame : UNFRAMED;
  return {
    catalogProductId: spec.catalogProductId,
    paperType: addFrame ? spec.framedPaperType : spec.paperType,
    size: spec.size,
    orientation: spec.orientation,
    includeFramingService: addFrame,
    includeMats: false,
    includeHangingPins: false,
    frameStyle: frame.frameStyle,
    frameColor: frame.frameColor,
  };
}

// ── Pricing (pure; identical maths on client + server) ───────────────────────

export type StudioFormat = "print" | "digital";

export type StudioLineItem = {
  label: string;
  cents: number;
  /** Anchor price to strike through, when this line is discounted. */
  listCents?: number;
};

/** A full snapshot of what the buyer is about to add — the cart/checkout input. */
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
  product: ProductBase;
  addFrame: boolean;
};

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as a US dollar string, e.g. 3900 → "$39.00". */
export function formatUsd(cents: number): string {
  return USD.format(cents / 100);
}

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
    return [
      {
        label: "Digital download",
        cents: DIGITAL_PRICE_CENTS,
        listCents: DIGITAL_LIST_PRICE_CENTS,
      },
    ];
  }
  return [
    {
      label: `${product.label} fine art print`,
      cents: product.priceCents,
      listCents: product.listPriceCents,
    },
    ...(addFrame
      ? [{ label: "Ready-to-hang frame", cents: product.frameUpchargeCents }]
      : []),
    // Bundled free with every print.
    { label: "Digital download", cents: 0 },
  ];
}

/** Assemble the immutable selection (frame forced off on digital). */
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

// ── Checkout wire contracts (frontend → backend) ─────────────────────────────

/**
 * One cart line as sent to POST /checkout/session. The backend re-derives the
 * price from the catalogue above using (productId, format, addFrame) — the
 * client never sends amounts. `posterConfig` is the immutable design snapshot
 * persisted onto the order for reproducibility/fulfilment.
 */
export type CheckoutItemInput = {
  productId: string;
  format: StudioFormat;
  addFrame: boolean;
  quantity: number;
  posterConfig?: Record<string, unknown>;
  /**
   * Public URL of the print-ready PNG (uploaded to blob storage by the browser
   * at add-to-cart). Handed to Artelo as the design source. Print items only.
   */
  assetUrl?: string;
};

export type CreateCheckoutRequest = {
  items: CheckoutItemInput[];
  /** Optional guest email; signed-in users are identified by their JWT. */
  email?: string;
};

export type CreateCheckoutResponse = { url: string };

/** Minimal order status the /checkout/success page reads back by session id. */
export type CheckoutOrderStatus = {
  orderNumber: string;
  status: OrderStatus;
};

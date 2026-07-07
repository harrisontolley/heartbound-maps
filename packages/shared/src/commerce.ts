// Commerce: the product catalogue, pricing, and checkout wire contracts. This is
// the single source of truth that both the studio (frontend) and the checkout
// (backend) read, so prices can be recomputed server-side and never trusted from
// the client. Money is integer USD cents (Stripe convention) — no float drift.
//
// The numeric catalogue lives here; the frontend layers the rendering-only SVG
// `viewBox` on top (see frontend/src/lib/commerce/printProducts.ts), which is why
// this module is free of any rendering/template dependency.

import type { OrderStatus } from "./orders.js";

/**
 * Name for the damage/fault guarantee. Surfaced on the landing page, the
 * dedicated /guarantee page (frontend/src/components/landing/copy.ts), and
 * the order-confirmation email (backend/src/emails/orderConfirmation.ts) —
 * lives here, not in either app, so the two customer-facing surfaces can
 * never drift apart on the name of the same promise.
 */
export const GUARANTEE_NAME = "The Arrives Perfect Guarantee";

// ── Tunable money (the single place to reprice) ──────────────────────────────

/**
 * Print retail by product id (the surfaced 2:3 portrait ladder).
 * COGS re-verified live against Artelo /catalog/get-costs 2026-07-03 —
 * unchanged from 2026-07-01. Loose prices nudged +$5/+$5/+$10 (2026-07-03)
 * to lift loose margins from ~55% toward the 60–75% D2C wall-art band while
 * keeping 12×18 under $69 and 16×24 under $100 for launch.
 */
export const PRINT_PRICE_CENTS: Record<string, number> = {
  "portrait-12x18": 6500, // German Etching landed COGS $27.21 → 58.1% margin
  "portrait-16x24": 9500, // German Etching landed COGS $41.14 → 56.7% margin
  "portrait-24x36": 17500, // German Etching landed COGS $74.14 → 57.6% margin
};

/**
 * Anchor ("regular") price by product id — the price these sizes will charge
 * once founding pricing ends (see FOUNDING_PRICES_END_ISO below). The UI does
 * not render this as a strikethrough/discount anywhere (a "was/now" badge on a
 * product that has never sold at the anchor price reads as a fake sale); it
 * exists so `discountPercent` and the future standard-rate reprice have a
 * number to work from. The price actually charged is always PRINT_PRICE_CENTS
 * — there is no Stripe coupon, and the server never re-derives a sale price.
 */
export const LIST_PRICE_CENTS: Record<string, number> = {
  "portrait-12x18": 8800, // 26% off $65 (true 26.1%, floored to 26)
  "portrait-16x24": 12900, // 26% off $95 (true 26.4%, floored to 26)
  "portrait-24x36": 23600, // 25% off $175 (true 25.8%, floored to 25)
};

/**
 * Founding pricing: the current PRINT_PRICE_CENTS/DIGITAL_PRICE_CENTS are an
 * honest, time-boxed introductory rate for early customers, not a fake
 * "sale" — surfaced as a plain-language deadline (see
 * frontend/src/lib/commerce/pricing.ts's `foundingPriceLine`), never a
 * struck-through anchor.
 *
 * SCHEDULED REPRICE — on this date, in one commit:
 *   - Set PRINT_PRICE_CENTS to today's LIST_PRICE_CENTS values:
 *       "portrait-12x18": 8800, "portrait-16x24": 12900, "portrait-24x36": 23600
 *   - Set DIGITAL_PRICE_CENTS to 2500 (today's DIGITAL_LIST_PRICE_CENTS)
 * That makes list === charged everywhere, so discountPercent/Anchor logic
 * self-suppresses with no further UI change needed. Do NOT flip this
 * automatically by date: static pages (/pricing, the landing page) bake
 * prices into their rendered HTML between revalidations, and the server must
 * never charge more than a page displays — a runtime flip could charge a
 * price higher than what a stale cached page showed. This is a scheduled,
 * reviewed commit on the ops calendar, not code that watches the clock.
 */
export const FOUNDING_PRICES_END_ISO = "2026-10-01";

/**
 * Whether founding pricing is still in effect. `now` defaults to the caller's
 * current time; pass an explicit Date for deterministic tests. Client
 * components should read a freshly-constructed `new Date()` post-hydration
 * (mirroring the existing useHydrated pattern for the delivery-ETA line) so
 * the server-rendered shell never disagrees with the visitor's own clock.
 */
export function isFoundingPricingActive(now: Date = new Date()): boolean {
  return now.getTime() < new Date(FOUNDING_PRICES_END_ISO).getTime();
}

/**
 * Ready-to-hang premium frame upcharge by product id (added on top of the print).
 * Framed prints use 300gsm 100% cotton-rag Hot Press paper (HotPressFineArt) — a
 * different, smooth stock from the textured German Etching used for loose prints —
 * in a premium natural-oak ready-to-hang frame (PremiumOak/NaturalOak, framing
 * service on). Framed Artelo landed COGS (production + US shipping, verified
 * 2026-07-01, re-verified 2026-07-03): 12×18 $49.47 / 16×24 $67.88 /
 * 24×36 $115.98. Upcharges shrank with the 2026-07-03 loose nudge so framed
 * opening-launch totals HOLD at $124 / $168 / $289, still ~60% margin.
 */
export const FRAME_UPCHARGE_CENTS: Record<string, number> = {
  "portrait-12x18": 5900, // framed total $124 (60.1% margin)
  "portrait-16x24": 7300, // framed total $168 (59.6% margin)
  "portrait-24x36": 11400, // framed total $289 (59.9% margin)
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
  /**
   * Named tier for the offered ladder ("Studio", "Signature", "Gallery"),
   * paired with the size everywhere it's shown (e.g. "Studio · 12 × 18 in").
   * Undefined for sizes outside the curated ladder (square/landscape).
   */
  tierName?: string;
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
    tierName?: string;
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
    // Fall back to the charged price for sizes without an anchor ⇒ no discount shown.
    listPriceCents: opts.listPriceCents ?? LIST_PRICE_CENTS[id] ?? priceCents,
    frameUpchargeCents: FRAME_UPCHARGE_CENTS[id] ?? DEFAULT_FRAME_UPCHARGE_CENTS,
    popular: opts.popular,
    badge: opts.badge,
    tierName: opts.tierName,
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
  product("portrait", 12, 18, { tierName: "Studio" }),
  product("portrait", 16, 24, { popular: true, tierName: "Signature" }),
  product("portrait", 24, 36, { badge: "Premium", tierName: "Gallery" }),
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
 *    paper that looks cleaner behind glass, whatever frame is chosen.
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
  },
  "portrait-16x24": {
    catalogProductId: "IndividualArtPrint",
    paperType: LOOSE_PAPER_TYPE,
    framedPaperType: FRAMED_PAPER_TYPE,
    size: "x16x24",
    orientation: "Vertical",
  },
  "portrait-24x36": {
    catalogProductId: "IndividualArtPrint",
    paperType: LOOSE_PAPER_TYPE,
    framedPaperType: FRAMED_PAPER_TYPE,
    size: "x24x36",
    orientation: "Vertical",
  },
};

// ── Frame picker (material + color) ──────────────────────────────────────────
//
// Ready-to-hang only (no insert-yourself option — see docs/integrations/artelo.md).
// All 8 colors map onto the Premium* frameStyle tiers, matching the single frame
// already in production use today, at a flat retail upcharge regardless of
// material (see the 2026-07-03 COGS spike in docs/integrations/artelo.md for why:
// frameColor never moves Artelo's quoted cost, and PremiumMetal actually runs a
// little cheaper than PremiumOak, so pricing them the same never sells at a loss).

export type FrameMaterial = "Oak" | "Metal";

export type FrameColor =
  | "NaturalOak"
  | "BlackOak"
  | "WhiteOak"
  | "WalnutOak"
  | "WhiteMetal"
  | "BlackMetal"
  | "SilverMetal"
  | "GoldMetal";

/** null = no frame (loose print). Non-null = the ready-to-hang frame chosen. */
export type FrameSelection = { material: FrameMaterial; color: FrameColor } | null;

export const FRAME_MATERIALS: readonly FrameMaterial[] = ["Oak", "Metal"];

export const FRAME_COLORS_BY_MATERIAL: Record<FrameMaterial, readonly FrameColor[]> = {
  Oak: ["NaturalOak", "BlackOak", "WhiteOak", "WalnutOak"],
  Metal: ["WhiteMetal", "BlackMetal", "SilverMetal", "GoldMetal"],
};

export const FRAME_COLOR_LABELS: Record<FrameColor, string> = {
  NaturalOak: "Natural Oak",
  BlackOak: "Black Oak",
  WhiteOak: "White Oak",
  WalnutOak: "Walnut Oak",
  WhiteMetal: "White Metal",
  BlackMetal: "Black Metal",
  SilverMetal: "Silver Metal",
  GoldMetal: "Gold Metal",
};

/** The default frame color offered when a buyer turns framing on. */
export const DEFAULT_FRAME_COLOR: FrameColor = "NaturalOak";

/** color → Artelo frameStyle/frameColor pair (frameStyle is always the Premium tier). */
export const FRAME_VARIANTS: Record<FrameColor, ArteloFrameSpec> = {
  NaturalOak: { frameStyle: "PremiumOak", frameColor: "NaturalOak" },
  BlackOak: { frameStyle: "PremiumOak", frameColor: "BlackOak" },
  WhiteOak: { frameStyle: "PremiumOak", frameColor: "WhiteOak" },
  WalnutOak: { frameStyle: "PremiumOak", frameColor: "WalnutOak" },
  WhiteMetal: { frameStyle: "PremiumMetal", frameColor: "WhiteMetal" },
  BlackMetal: { frameStyle: "PremiumMetal", frameColor: "BlackMetal" },
  SilverMetal: { frameStyle: "PremiumMetal", frameColor: "SilverMetal" },
  GoldMetal: { frameStyle: "PremiumMetal", frameColor: "GoldMetal" },
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
 * Returns null for products we don't fulfil through Artelo. When `frame` is set,
 * the chosen frame's attributes + framing service (ready-to-hang) are included
 * and the print runs on the framed paper (HotPressFineArt, 300gsm cotton rag —
 * smooth behind glass); otherwise the frame fields are "Unframed" (required by
 * Artelo's schema) and the print runs on the loose paper (GermanEtchingFineArt,
 * Hahnemühle 310gsm, textured).
 */
export function arteloProductInfoFor(
  productId: string,
  frame: FrameSelection,
): ArteloProductInfo | null {
  const spec = ARTELO_PRODUCT_BY_ID[productId];
  if (!spec) return null;
  const frameSpec = frame ? FRAME_VARIANTS[frame.color] : UNFRAMED;
  return {
    catalogProductId: spec.catalogProductId,
    paperType: frame ? spec.framedPaperType : spec.paperType,
    size: spec.size,
    orientation: spec.orientation,
    includeFramingService: frame !== null,
    includeMats: false,
    includeHangingPins: false,
    frameStyle: frameSpec.frameStyle,
    frameColor: frameSpec.frameColor,
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
  frame: FrameSelection;
  totalCents: number;
  lineItems: StudioLineItem[];
};

type PriceInput = {
  format: StudioFormat;
  product: ProductBase;
  frame: FrameSelection;
};

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as a US dollar string, e.g. 3900 → "$39.00". */
export function formatUsd(cents: number): string {
  return USD.format(cents / 100);
}

/** Total in cents: digital is flat; a print adds the flat frame upcharge when framed. */
export function selectionTotalCents({
  format,
  product,
  frame,
}: PriceInput): number {
  if (format === "digital") return DIGITAL_PRICE_CENTS;
  return product.priceCents + (frame ? product.frameUpchargeCents : 0);
}

/** Line items for the buy-bar breakdown. A 0-cent item renders as "Free". */
export function selectionLineItems({
  format,
  product,
  frame,
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
    ...(frame
      ? [
          {
            label: `Ready-to-hang frame in ${FRAME_COLOR_LABELS[frame.color]}`,
            cents: product.frameUpchargeCents,
          },
        ]
      : []),
    // Bundled free with every print.
    { label: "Digital download", cents: 0 },
  ];
}

/** Assemble the immutable selection (frame forced off on digital). */
export function buildSelection({
  format,
  product,
  frame,
}: PriceInput): StudioSelection {
  const effectiveFrame = format === "print" ? frame : null;
  const input = { format, product, frame: effectiveFrame };
  return {
    format,
    productId: product.id,
    size: {
      label: product.label,
      widthIn: product.widthIn,
      heightIn: product.heightIn,
    },
    frame: effectiveFrame,
    totalCents: selectionTotalCents(input),
    lineItems: selectionLineItems(input),
  };
}

// ── Checkout wire contracts (frontend → backend) ─────────────────────────────

/**
 * One cart line as sent to POST /checkout/session. The backend re-derives the
 * price from the catalogue above using (productId, format, frame) — the
 * client never sends amounts. `posterConfig` is the immutable design snapshot
 * persisted onto the order for reproducibility/fulfilment.
 */
export type CheckoutItemInput = {
  productId: string;
  format: StudioFormat;
  frame: FrameSelection;
  quantity: number;
  posterConfig?: Record<string, unknown>;
  /**
   * Public URL of the full-res poster PNG (uploaded to blob storage by the
   * browser at add-to-cart), for any format. For print, this is the print-DPI
   * export handed to Artelo as the design source; for digital, it's the fixed
   * 3x rasterization delivered to the buyer post-payment.
   */
  assetUrl?: string;
  /**
   * Public URL of the vector SVG (uploaded to blob storage by the browser at
   * add-to-cart). Delivered to the buyer post-payment alongside the full-res
   * PNG — the digital tier's actual asset, and a bonus for print buyers.
   */
  svgAssetUrl?: string;
  /**
   * Public URL of the phone wallpaper PNG (uploaded to blob storage by the
   * browser at add-to-cart) — a bonus render of the buyer's exact design at
   * phone-wallpaper proportions (POSTER_SIZES.phone, 9:16). Generation/upload
   * is best-effort like assetUrl/svgAssetUrl, so it's absent when it failed;
   * delivered post-payment alongside the other digital files.
   */
  phoneWallpaperAssetUrl?: string;
  /**
   * Public URL of the desktop wallpaper PNG (POSTER_SIZES.desktop, 16:9) — the
   * same bonus render at desktop-wallpaper proportions.
   */
  desktopWallpaperAssetUrl?: string;
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

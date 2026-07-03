import type Stripe from "stripe";
import type { CheckoutItemInput, FrameColor, FrameMaterial, FrameSelection } from "@pinprint/shared";
import {
  FRAME_COLORS_BY_MATERIAL,
  PRODUCTS_BASE_BY_ID,
  selectionTotalCents,
} from "@pinprint/shared";
import type { NewOrderItem } from "./orders.js";
import { isAllowedAssetUrl } from "./assetUrl.js";

// Server-side price authority for checkout. The client sends only what was
// chosen (productId, format, frame, quantity); this module re-derives every
// amount from the shared catalogue so a tampered client total can never reach
// Stripe. Pure + dependency-light so it unit-tests without a DB or Stripe key.

/** True for a well-formed frame selection (material/color pair from the shared catalogue). */
function isValidFrame(frame: unknown): frame is Exclude<FrameSelection, null> {
  if (typeof frame !== "object" || frame === null) return false;
  const f = frame as { material?: unknown; color?: unknown };
  if (typeof f.material !== "string" || typeof f.color !== "string") return false;
  const colors = FRAME_COLORS_BY_MATERIAL[f.material as FrameMaterial] as
    | readonly FrameColor[]
    | undefined;
  return colors !== undefined && colors.includes(f.color as FrameColor);
}

const MAX_QUANTITY = 25;

// The print-asset allow-list check (isAllowedAssetUrl) lives in ./assetUrl —
// shared with routes/leads.ts, which needs the same host allow-list for the
// free lead-magnet download. Re-exported here so existing imports keep working.
export { isAllowedAssetUrl } from "./assetUrl.js";

/** Thrown for any client-supplied cart that fails validation → maps to a 400. */
export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

export type PricedCheckout = {
  /** Line items to persist on the order (authoritative unit prices). */
  orderItems: NewOrderItem[];
  /** Inline Stripe line items (one per cart entry, frame folded into unit price). */
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  subtotalCents: number;
  /** True when any item is a physical print → collect a shipping address. */
  hasPhysical: boolean;
};

/** Validate + price a cart. Throws CheckoutValidationError on bad input. */
export function priceCheckout(items: CheckoutItemInput[]): PricedCheckout {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutValidationError("empty_cart");
  }

  const orderItems: NewOrderItem[] = [];
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let subtotalCents = 0;
  let hasPhysical = false;

  for (const it of items) {
    const product = it && PRODUCTS_BASE_BY_ID[it.productId];
    if (!product) {
      throw new CheckoutValidationError(`unknown_product:${it?.productId ?? ""}`);
    }
    if (it.format !== "print" && it.format !== "digital") {
      throw new CheckoutValidationError("invalid_format");
    }
    const quantity = Number.isInteger(it.quantity) ? it.quantity : 0;
    if (quantity < 1 || quantity > MAX_QUANTITY) {
      throw new CheckoutValidationError("invalid_quantity");
    }

    const isPrint = it.format === "print";
    // The design source must be one of our own blob URLs (never arbitrary).
    // For prints, this is the print-ready PNG; for digital, it's the digital deliverable.
    if (it.assetUrl && !isAllowedAssetUrl(it.assetUrl)) {
      throw new CheckoutValidationError("invalid_asset_url");
    }
    // The vector SVG travels for any format (it's the digital tier's actual
    // asset, and a bonus for print buyers) — same host allow-list as assetUrl.
    if (it.svgAssetUrl && !isAllowedAssetUrl(it.svgAssetUrl)) {
      throw new CheckoutValidationError("invalid_asset_url");
    }
    // A frame only ever applies to a print; digital always ignores it. A
    // present-but-malformed frame is a validation error (never silently
    // dropped) — a tampered/buggy client should 400, not quietly go unframed.
    if (it.frame !== null && it.frame !== undefined && !isValidFrame(it.frame)) {
      throw new CheckoutValidationError("invalid_frame");
    }
    const frame: FrameSelection = isPrint && isValidFrame(it.frame) ? it.frame : null;
    // Authoritative unit price — never trust a client-sent amount.
    const unitPriceCents = selectionTotalCents({ format: it.format, product, frame });
    const label = isPrint
      ? `${product.label} print${frame ? " (framed)" : ""}`
      : "Digital download";
    if (isPrint) hasPhysical = true;

    orderItems.push({
      productId: product.id,
      productLabel: label,
      quantity,
      unitPriceCents,
      // `frame` is overwritten with the server-validated value (never the raw
      // client one) so fulfilment always reads exactly what was charged.
      posterConfig: { ...(it.posterConfig ?? {}), frame },
      // Public URL of the design source (browser-uploaded at add-to-cart).
      // For prints: the print-ready PNG (handed to Artelo).
      // For digital: the digital deliverable PNG.
      assetUrl: it.assetUrl,
      // Public URL of the vector SVG (browser-uploaded at add-to-cart). Carried
      // for any format — it's what the post-payment digital-delivery email links to.
      svgAssetUrl: it.svgAssetUrl,
    });

    lineItems.push({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: unitPriceCents,
        product_data: {
          name: label,
          metadata: {
            productId: product.id,
            format: it.format,
            addFrame: String(frame !== null),
            ...(frame ? { frameMaterial: frame.material, frameColor: frame.color } : {}),
          },
        },
      },
    });

    subtotalCents += unitPriceCents * quantity;
  }

  return { orderItems, lineItems, subtotalCents, hasPhysical };
}

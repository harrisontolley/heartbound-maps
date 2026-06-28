import type Stripe from "stripe";
import type { CheckoutItemInput } from "@pinprint/shared";
import {
  PRODUCTS_BASE_BY_ID,
  selectionTotalCents,
} from "@pinprint/shared";
import type { NewOrderItem } from "./orders.js";

// Server-side price authority for checkout. The client sends only what was
// chosen (productId, format, addFrame, quantity); this module re-derives every
// amount from the shared catalogue so a tampered client total can never reach
// Stripe. Pure + dependency-light so it unit-tests without a DB or Stripe key.

const MAX_QUANTITY = 25;

// Print assets are uploaded by the browser to Vercel Blob (see routes/uploads.ts),
// which returns a public *.blob.vercel-storage.com URL. We hand that URL to Artelo
// as the design source, so we must only accept URLs on that host — otherwise a
// crafted request could make us submit an arbitrary remote image (SSRF/abuse).
// Override the allowed host suffixes with BLOB_ALLOWED_HOSTS (comma-separated).
function allowedAssetHosts(): string[] {
  const raw = process.env.BLOB_ALLOWED_HOSTS;
  if (raw) return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return ["blob.vercel-storage.com"];
}

/** True when an asset URL is an https URL on an allowed blob host. */
export function isAllowedAssetUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return allowedAssetHosts().some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

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
    // A print's design source must be one of our own blob URLs (never arbitrary).
    if (isPrint && it.assetUrl && !isAllowedAssetUrl(it.assetUrl)) {
      throw new CheckoutValidationError("invalid_asset_url");
    }
    const addFrame = isPrint && it.addFrame === true;
    // Authoritative unit price — never trust a client-sent amount.
    const unitPriceCents = selectionTotalCents({ format: it.format, product, addFrame });
    const label = isPrint
      ? `${product.label} print${addFrame ? " (framed)" : ""}`
      : "Digital download";
    if (isPrint) hasPhysical = true;

    orderItems.push({
      productId: product.id,
      productLabel: label,
      quantity,
      unitPriceCents,
      posterConfig: it.posterConfig ?? {},
      // Public URL of the print-ready PNG (browser-uploaded at add-to-cart).
      // Handed to Artelo as the design source; print items only.
      assetUrl: isPrint ? it.assetUrl : undefined,
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
            addFrame: String(addFrame),
          },
        },
      },
    });

    subtotalCents += unitPriceCents * quantity;
  }

  return { orderItems, lineItems, subtotalCents, hasPhysical };
}

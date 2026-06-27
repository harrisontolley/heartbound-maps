import type Stripe from "stripe";
import type { CheckoutItemInput } from "@pinprint/shared";
import {
  PRODUCTS_BASE_BY_ID,
  PRODIGI_SKU_BY_PRODUCT_ID,
  selectionTotalCents,
} from "@pinprint/shared";
import type { NewOrderItem } from "./orders.js";

// Server-side price authority for checkout. The client sends only what was
// chosen (productId, format, addFrame, quantity); this module re-derives every
// amount from the shared catalogue so a tampered client total can never reach
// Stripe. Pure + dependency-light so it unit-tests without a DB or Stripe key.

const MAX_QUANTITY = 25;

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
      // Recorded for Phase-2 Prodigi fulfilment (undefined until SKUs are wired).
      prodigiSku: isPrint ? PRODIGI_SKU_BY_PRODUCT_ID[product.id] : undefined,
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

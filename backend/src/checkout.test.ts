import { describe, expect, it } from "vitest";
import { DIGITAL_PRICE_CENTS, PRODUCTS_BASE_BY_ID } from "@pinprint/shared";
import { CheckoutValidationError, isAllowedAssetUrl, priceCheckout } from "./checkout.js";

// The checkout pricer is the security boundary: the client sends only choices
// (productId, format, addFrame, quantity), never amounts. These assert the
// server re-derives every price from the shared catalogue and rejects bad input.

const popular = PRODUCTS_BASE_BY_ID["portrait-16x24"];

describe("priceCheckout — server price authority", () => {
  it("prices a print from the catalogue and carries the poster snapshot", () => {
    const { orderItems, lineItems, subtotalCents, hasPhysical } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "print",
        addFrame: false,
        quantity: 2,
        posterConfig: { templateId: "vintage" },
      },
    ]);
    expect(orderItems[0].unitPriceCents).toBe(popular.priceCents);
    expect(orderItems[0].quantity).toBe(2);
    expect(orderItems[0].posterConfig).toEqual({ templateId: "vintage" });
    expect(subtotalCents).toBe(popular.priceCents * 2);
    expect(hasPhysical).toBe(true);
    // One Stripe line item per cart entry, at the authoritative unit price.
    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].price_data?.unit_amount).toBe(popular.priceCents);
    expect(lineItems[0].quantity).toBe(2);
  });

  it("folds the frame upcharge into the unit price", () => {
    const { orderItems, lineItems } = priceCheckout([
      { productId: "portrait-16x24", format: "print", addFrame: true, quantity: 1 },
    ]);
    const expected = popular.priceCents + popular.frameUpchargeCents;
    expect(orderItems[0].unitPriceCents).toBe(expected);
    expect(lineItems[0].price_data?.unit_amount).toBe(expected);
  });

  it("prices digital flat and never marks the cart physical", () => {
    const { orderItems, hasPhysical } = priceCheckout([
      // addFrame is meaningless for digital and must not change the price.
      { productId: "portrait-24x36", format: "digital", addFrame: true, quantity: 3 },
    ]);
    expect(orderItems[0].unitPriceCents).toBe(DIGITAL_PRICE_CENTS);
    expect(hasPhysical).toBe(false);
  });

  it("flags physical when any item in a mixed cart is a print", () => {
    const { hasPhysical } = priceCheckout([
      { productId: "portrait-12x18", format: "digital", addFrame: false, quantity: 1 },
      { productId: "portrait-12x18", format: "print", addFrame: false, quantity: 1 },
    ]);
    expect(hasPhysical).toBe(true);
  });

  it("rejects an empty cart", () => {
    expect(() => priceCheckout([])).toThrow(CheckoutValidationError);
  });

  it("rejects an unknown product id", () => {
    expect(() =>
      priceCheckout([{ productId: "nope", format: "print", addFrame: false, quantity: 1 }]),
    ).toThrow(/unknown_product/);
  });

  it("rejects out-of-range quantities", () => {
    expect(() =>
      priceCheckout([{ productId: "portrait-16x24", format: "print", addFrame: false, quantity: 0 }]),
    ).toThrow(CheckoutValidationError);
    expect(() =>
      priceCheckout([
        { productId: "portrait-16x24", format: "print", addFrame: false, quantity: 999 },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("rejects an invalid format", () => {
    expect(() =>
      priceCheckout([
        { productId: "portrait-16x24", format: "poster" as never, addFrame: false, quantity: 1 },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("rejects a print whose assetUrl is not a Vercel Blob URL (anti-SSRF)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "print",
          addFrame: false,
          quantity: 1,
          assetUrl: "https://evil.example.com/x.png",
        },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("accepts a print with a blob.vercel-storage.com assetUrl", () => {
    const { orderItems } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "print",
        addFrame: false,
        quantity: 1,
        assetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x.png",
      },
    ]);
    expect(orderItems[0].assetUrl).toContain("blob.vercel-storage.com");
  });
});

describe("isAllowedAssetUrl", () => {
  it("accepts https Vercel Blob hosts", () => {
    expect(isAllowedAssetUrl("https://s.public.blob.vercel-storage.com/p.png")).toBe(true);
    expect(isAllowedAssetUrl("https://blob.vercel-storage.com/p.png")).toBe(true);
  });
  it("rejects other hosts, http, and junk", () => {
    expect(isAllowedAssetUrl("https://evil.com/p.png")).toBe(false);
    expect(isAllowedAssetUrl("http://s.public.blob.vercel-storage.com/p.png")).toBe(false);
    expect(isAllowedAssetUrl("not-a-url")).toBe(false);
    // suffix-spoofing must not pass (host that merely contains the string)
    expect(isAllowedAssetUrl("https://blob.vercel-storage.com.evil.com/p.png")).toBe(false);
  });
});

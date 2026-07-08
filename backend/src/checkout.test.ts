import { describe, expect, it } from "vitest";
import { DIGITAL_PRICE_CENTS, PRODUCTS_BASE_BY_ID } from "@heartbound/shared";
import { CheckoutValidationError, isAllowedAssetUrl, priceCheckout } from "./checkout.js";

// The checkout pricer is the security boundary: the client sends only choices
// (productId, format, frame, quantity), never amounts. These assert the
// server re-derives every price from the shared catalogue and rejects bad input.

const popular = PRODUCTS_BASE_BY_ID["portrait-16x24"];

describe("priceCheckout — server price authority", () => {
  it("uses the opening-launch price ladder", () => {
    const totals = ["portrait-12x18", "portrait-16x24", "portrait-24x36"].map(
      (productId) =>
        priceCheckout([
          { productId, format: "print", frame: null, quantity: 1 },
        ]).subtotalCents,
    );

    expect(totals).toEqual([6500, 9500, 17500]);
  });

  it("prices a print from the catalogue and carries the poster snapshot", () => {
    const { orderItems, lineItems, subtotalCents, hasPhysical } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "print",
        frame: null,
        quantity: 2,
        posterConfig: { templateId: "vintage" },
      },
    ]);
    expect(orderItems[0].unitPriceCents).toBe(popular.priceCents);
    expect(orderItems[0].quantity).toBe(2);
    expect(orderItems[0].posterConfig).toEqual({ templateId: "vintage", frame: null });
    expect(subtotalCents).toBe(popular.priceCents * 2);
    expect(hasPhysical).toBe(true);
    // One Stripe line item per cart entry, at the authoritative unit price.
    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].price_data?.unit_amount).toBe(popular.priceCents);
    expect(lineItems[0].quantity).toBe(2);
  });

  it("charges the sale price, never the (higher) display list anchor", () => {
    // The anchor is display-only; the server must charge priceCents.
    expect(popular.listPriceCents).toBeGreaterThan(popular.priceCents);
    const { lineItems, subtotalCents } = priceCheckout([
      { productId: "portrait-16x24", format: "print", frame: null, quantity: 1 },
    ]);
    expect(lineItems[0].price_data?.unit_amount).toBe(popular.priceCents);
    expect(subtotalCents).toBeLessThan(popular.listPriceCents);
  });

  it("folds the frame upcharge into the unit price, regardless of material/color", () => {
    for (const frame of [
      { material: "Oak" as const, color: "NaturalOak" as const },
      { material: "Metal" as const, color: "GoldMetal" as const },
    ]) {
      const { orderItems, lineItems } = priceCheckout([
        { productId: "portrait-16x24", format: "print", frame, quantity: 1 },
      ]);
      const expected = popular.priceCents + popular.frameUpchargeCents;
      expect(orderItems[0].unitPriceCents).toBe(expected);
      expect(lineItems[0].price_data?.unit_amount).toBe(expected);
    }
  });

  it("rejects a malformed frame on a print (mismatched material/color pair)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "print",
          frame: { material: "Oak", color: "GoldMetal" } as never,
          quantity: 1,
        },
      ]),
    ).toThrow(/invalid_frame/);
  });

  it("writes the validated frame into posterConfig for a framed print", () => {
    // This is the value fulfilment later reads to pick Artelo's frame.
    const frame = { material: "Metal" as const, color: "BlackMetal" as const };
    const { orderItems } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "print",
        frame,
        quantity: 1,
        posterConfig: { templateId: "vintage" },
      },
    ]);
    expect(orderItems[0].posterConfig).toEqual({ templateId: "vintage", frame });
  });

  it("prices digital flat and never marks the cart physical", () => {
    const { orderItems, hasPhysical } = priceCheckout([
      // frame is meaningless for digital and must not change the price.
      { productId: "portrait-24x36", format: "digital", frame: { material: "Oak", color: "NaturalOak" }, quantity: 3 },
    ]);
    expect(orderItems[0].unitPriceCents).toBe(DIGITAL_PRICE_CENTS);
    expect(hasPhysical).toBe(false);
  });

  it("ignores even a malformed frame on a digital item (coerced to null, not a 400)", () => {
    const { orderItems, hasPhysical } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "digital",
        frame: { material: "Oak", color: "GoldMetal" } as never,
        quantity: 1,
      },
    ]);
    expect(orderItems[0].unitPriceCents).toBe(DIGITAL_PRICE_CENTS);
    expect(orderItems[0].posterConfig).toEqual({ frame: null });
    expect(hasPhysical).toBe(false);
  });

  it("flags physical when any item in a mixed cart is a print", () => {
    const { hasPhysical } = priceCheckout([
      { productId: "portrait-12x18", format: "digital", frame: null, quantity: 1 },
      { productId: "portrait-12x18", format: "print", frame: null, quantity: 1 },
    ]);
    expect(hasPhysical).toBe(true);
  });

  it("rejects an empty cart", () => {
    expect(() => priceCheckout([])).toThrow(CheckoutValidationError);
  });

  it("rejects an unknown product id", () => {
    expect(() =>
      priceCheckout([{ productId: "nope", format: "print", frame: null, quantity: 1 }]),
    ).toThrow(/unknown_product/);
  });

  it("rejects out-of-range quantities", () => {
    expect(() =>
      priceCheckout([{ productId: "portrait-16x24", format: "print", frame: null, quantity: 0 }]),
    ).toThrow(CheckoutValidationError);
    expect(() =>
      priceCheckout([
        { productId: "portrait-16x24", format: "print", frame: null, quantity: 999 },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("rejects an invalid format", () => {
    expect(() =>
      priceCheckout([
        { productId: "portrait-16x24", format: "poster" as never, frame: null, quantity: 1 },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("rejects a print whose assetUrl is not a Vercel Blob URL (anti-SSRF)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "print",
          frame: null,
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
        frame: null,
        quantity: 1,
        assetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x.png",
      },
    ]);
    expect(orderItems[0].assetUrl).toContain("blob.vercel-storage.com");
  });

  it("persists a valid svgAssetUrl onto the order item", () => {
    const { orderItems } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "digital",
        frame: null,
        quantity: 1,
        svgAssetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x.svg",
      },
    ]);
    expect(orderItems[0].svgAssetUrl).toBe(
      "https://abc123.public.blob.vercel-storage.com/posters/x.svg",
    );
  });

  it("rejects an svgAssetUrl on a disallowed host (anti-SSRF)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "digital",
          frame: null,
          quantity: 1,
          svgAssetUrl: "https://evil.example.com/x.svg",
        },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("leaves svgAssetUrl null when absent", () => {
    const { orderItems } = priceCheckout([
      { productId: "portrait-16x24", format: "digital", frame: null, quantity: 1 },
    ]);
    expect(orderItems[0].svgAssetUrl).toBeUndefined();
  });

  it("accepts a digital item with a blob.vercel-storage.com assetUrl", () => {
    const { orderItems } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "digital",
        frame: null,
        quantity: 1,
        assetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x.png",
      },
    ]);
    expect(orderItems[0].assetUrl).toContain("blob.vercel-storage.com");
  });

  it("persists both a valid assetUrl and svgAssetUrl onto the same order item (print + digital bundle)", () => {
    const { orderItems } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "print",
        frame: null,
        quantity: 1,
        assetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x.png",
        svgAssetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x.svg",
      },
    ]);
    expect(orderItems[0].assetUrl).toBe("https://abc123.public.blob.vercel-storage.com/posters/x.png");
    expect(orderItems[0].svgAssetUrl).toBe("https://abc123.public.blob.vercel-storage.com/posters/x.svg");
  });

  it("rejects a digital item whose assetUrl is not a Vercel Blob URL (anti-SSRF)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "digital",
          frame: null,
          quantity: 1,
          assetUrl: "https://evil.example.com/x.png",
        },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("persists valid phoneWallpaperAssetUrl and desktopWallpaperAssetUrl onto the order item", () => {
    const { orderItems } = priceCheckout([
      {
        productId: "portrait-16x24",
        format: "print",
        frame: null,
        quantity: 1,
        phoneWallpaperAssetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x-phone.png",
        desktopWallpaperAssetUrl: "https://abc123.public.blob.vercel-storage.com/posters/x-desktop.png",
      },
    ]);
    expect(orderItems[0].phoneWallpaperAssetUrl).toBe(
      "https://abc123.public.blob.vercel-storage.com/posters/x-phone.png",
    );
    expect(orderItems[0].desktopWallpaperAssetUrl).toBe(
      "https://abc123.public.blob.vercel-storage.com/posters/x-desktop.png",
    );
  });

  it("leaves phoneWallpaperAssetUrl and desktopWallpaperAssetUrl undefined when absent (best-effort upload can fail)", () => {
    const { orderItems } = priceCheckout([
      { productId: "portrait-16x24", format: "print", frame: null, quantity: 1 },
    ]);
    expect(orderItems[0].phoneWallpaperAssetUrl).toBeUndefined();
    expect(orderItems[0].desktopWallpaperAssetUrl).toBeUndefined();
  });

  it("rejects a phoneWallpaperAssetUrl on a disallowed host (anti-SSRF)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "print",
          frame: null,
          quantity: 1,
          phoneWallpaperAssetUrl: "https://evil.example.com/x-phone.png",
        },
      ]),
    ).toThrow(CheckoutValidationError);
  });

  it("rejects a desktopWallpaperAssetUrl on a disallowed host (anti-SSRF)", () => {
    expect(() =>
      priceCheckout([
        {
          productId: "portrait-16x24",
          format: "print",
          frame: null,
          quantity: 1,
          desktopWallpaperAssetUrl: "https://evil.example.com/x-desktop.png",
        },
      ]),
    ).toThrow(CheckoutValidationError);
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

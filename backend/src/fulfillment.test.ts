import { describe, expect, it } from "vitest";
import { buildCreateOrderBody } from "./fulfillment.js";
import type { FulfillmentOrder } from "./orders.js";

// Body-shaping is the risky part of fulfilment (it must match Artelo's schema),
// so we test it directly without a DB or network.

function order(overrides: Partial<FulfillmentOrder> = {}): FulfillmentOrder {
  return {
    id: "ord-uuid",
    orderNumber: "PP-ABCD2345",
    email: "buyer@example.com",
    currency: "usd",
    totalCents: 5900,
    arteloOrderId: null,
    shipping: {
      name: "Ada Lovelace",
      line1: "1 Analytical Way",
      city: "London",
      region: "Greater London",
      postal: "SW1A 1AA",
      country: "GB",
    },
    items: [
      {
        id: "item-1",
        productId: "portrait-16x24",
        productLabel: "16 × 24 in print",
        quantity: 1,
        unitPriceCents: 5900,
        assetUrl: "https://blob.example/poster.png",
        svgAssetUrl: null,
        renderAssetUrl: null,
        posterConfig: { format: "print", addFrame: false },
      },
    ],
    ...overrides,
  };
}

describe("buildCreateOrderBody", () => {
  it("maps a paid print order to Artelo's create-order shape", () => {
    const body = buildCreateOrderBody(order(), true);
    expect(body.orderId).toBe("PP-ABCD2345");
    expect(body.currency).toBe("USD");
    expect(body.total).toBe(59);
    expect(body.isTestOrder).toBe(true);
    expect(typeof body.createdAt).toBe("string"); // required by Artelo
    expect(body.customerAddress).toMatchObject({
      name: "Ada Lovelace",
      street1: "1 Analytical Way",
      city: "London",
      state: "Greater London",
      zipcode: "SW1A 1AA",
      country: "GB",
    });
    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    expect(item.unitPrice).toBe(59);
    expect(item.productInfo).toMatchObject({
      catalogProductId: "IndividualArtPrint",
      paperType: "GermanEtchingFineArt",
      size: "x16x24",
      orientation: "Vertical",
      includeFramingService: false,
      frameStyle: "Unframed",
      frameColor: "Unframed",
    });
    expect(item.productInfo.designs[0].sourceImage.url).toBe("https://blob.example/poster.png");
  });

  it("includes frame attributes for a legacy addFrame:true order (pre-frame-picker)", () => {
    const o = order({
      items: [
        {
          id: "item-1",
          productId: "portrait-16x24",
          productLabel: "16 × 24 in print (framed)",
          quantity: 1,
          unitPriceCents: 16900,
          assetUrl: "https://blob.example/poster.png",
          svgAssetUrl: null,
          renderAssetUrl: null,
          posterConfig: { format: "print", addFrame: true },
        },
      ],
    });
    const body = buildCreateOrderBody(o, false);
    expect(body.items[0].productInfo).toMatchObject({
      paperType: "HotPressFineArt",
      includeFramingService: true,
      frameStyle: "PremiumOak",
      frameColor: "NaturalOak",
    });
  });

  it("includes frame attributes for the current {material, color} shape (Oak)", () => {
    const o = order({
      items: [
        {
          id: "item-1",
          productId: "portrait-16x24",
          productLabel: "16 × 24 in print (framed)",
          quantity: 1,
          unitPriceCents: 16900,
          assetUrl: "https://blob.example/poster.png",
          svgAssetUrl: null,
          renderAssetUrl: null,
          posterConfig: { format: "print", frame: { material: "Oak", color: "WalnutOak" } },
        },
      ],
    });
    const body = buildCreateOrderBody(o, false);
    expect(body.items[0].productInfo).toMatchObject({
      paperType: "HotPressFineArt",
      includeFramingService: true,
      frameStyle: "PremiumOak",
      frameColor: "WalnutOak",
    });
  });

  it("includes frame attributes for the current {material, color} shape (Metal)", () => {
    const o = order({
      items: [
        {
          id: "item-1",
          productId: "portrait-16x24",
          productLabel: "16 × 24 in print (framed)",
          quantity: 1,
          unitPriceCents: 16900,
          assetUrl: "https://blob.example/poster.png",
          svgAssetUrl: null,
          renderAssetUrl: null,
          posterConfig: { format: "print", frame: { material: "Metal", color: "GoldMetal" } },
        },
      ],
    });
    const body = buildCreateOrderBody(o, false);
    expect(body.items[0].productInfo).toMatchObject({
      paperType: "HotPressFineArt",
      includeFramingService: true,
      frameStyle: "PremiumMetal",
      frameColor: "GoldMetal",
    });
  });

  it("treats a malformed frame (mismatched material/color) as unframed rather than guessing", () => {
    const o = order({
      items: [
        {
          id: "item-1",
          productId: "portrait-16x24",
          productLabel: "16 × 24 in print",
          quantity: 1,
          unitPriceCents: 9500,
          assetUrl: "https://blob.example/poster.png",
          svgAssetUrl: null,
          renderAssetUrl: null,
          posterConfig: { format: "print", frame: { material: "Oak", color: "GoldMetal" } },
        },
      ],
    });
    const body = buildCreateOrderBody(o, false);
    expect(body.items[0].productInfo).toMatchObject({
      paperType: "GermanEtchingFineArt",
      includeFramingService: false,
      frameStyle: "Unframed",
      frameColor: "Unframed",
    });
  });

  it("resolves each design URL through resolveAssetUrl (signed at submit time)", () => {
    const body = buildCreateOrderBody(order(), true, (u) => `${u}?sig=abc`);
    expect(body.items[0].productInfo.designs[0].sourceImage.url).toBe(
      "https://blob.example/poster.png?sig=abc",
    );
  });

  it("drops digital items and print items missing an asset URL", () => {
    const o = order({
      items: [
        {
          id: "item-1",
          productId: "portrait-16x24",
          productLabel: "Digital download",
          quantity: 1,
          unitPriceCents: 1200,
          assetUrl: null,
          svgAssetUrl: null,
          renderAssetUrl: null,
          posterConfig: { format: "digital" },
        },
        {
          id: "item-2",
          productId: "portrait-12x18",
          productLabel: "12 × 18 in print",
          quantity: 1,
          unitPriceCents: 3900,
          assetUrl: null, // no print-ready asset → skipped
          svgAssetUrl: null,
          renderAssetUrl: null,
          posterConfig: { format: "print", addFrame: false },
        },
      ],
    });
    expect(buildCreateOrderBody(o, true).items).toHaveLength(0);
  });
});

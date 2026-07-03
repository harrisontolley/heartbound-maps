import { describe, it, expect } from "vitest";
import {
  PRINT_PRODUCTS,
  PRODUCTS_BY_ID,
  DEFAULT_PRODUCT_ID,
  ORIENTATION_ORDER,
  OFFERED_PRODUCTS,
  productsByOrientation,
} from "./printProducts";
import { formatUsd } from "./price";
import { POSTER_SIZES } from "../templates/sizes";

describe("formatUsd", () => {
  it("renders integer cents as US dollars", () => {
    expect(formatUsd(2900)).toBe("$29.00");
    expect(formatUsd(3900)).toBe("$39.00");
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("print products", () => {
  it("defaults to the popular 16×24 portrait", () => {
    const def = PRODUCTS_BY_ID[DEFAULT_PRODUCT_ID];
    expect(def).toBeDefined();
    expect(def.orientation).toBe("portrait");
    expect(def.label).toBe("16 × 24 in");
    expect(def.popular).toBe(true);
  });

  it("marks exactly one product as popular", () => {
    expect(PRINT_PRODUCTS.filter((p) => p.popular)).toHaveLength(1);
  });

  it("offers products for every orientation", () => {
    for (const o of ORIENTATION_ORDER) {
      expect(productsByOrientation(o).length).toBeGreaterThan(0);
    }
  });

  it("surfaces the curated 2:3 portrait ladder, one popular", () => {
    expect(OFFERED_PRODUCTS.map((p) => p.id)).toEqual([
      "portrait-12x18",
      "portrait-16x24",
      "portrait-24x36",
    ]);
    expect(OFFERED_PRODUCTS.every((p) => p.orientation === "portrait")).toBe(
      true,
    );
    expect(OFFERED_PRODUCTS.filter((p) => p.popular)).toHaveLength(1);
  });

  it("uses the opening-launch price ladder and regular-price anchors", () => {
    expect(OFFERED_PRODUCTS.map((p) => p.priceCents)).toEqual([6000, 9000, 16500]);
    expect(OFFERED_PRODUCTS.map((p) => p.listPriceCents)).toEqual([8200, 12200, 22000]);
  });

  it("gives every product a frame upcharge", () => {
    for (const p of PRINT_PRODUCTS) {
      expect(p.frameUpchargeCents).toBeGreaterThan(0);
    }
  });

  it("floors each advertised opening-launch discount without overstating it", () => {
    const discounts = OFFERED_PRODUCTS.map((p) =>
      Math.floor(((p.listPriceCents - p.priceCents) / p.listPriceCents) * 100),
    );
    expect(discounts).toEqual([26, 26, 25]);
  });

  it("never lets an anchor fall below its charged price", () => {
    for (const p of PRINT_PRODUCTS) {
      expect(p.listPriceCents).toBeGreaterThanOrEqual(p.priceCents);
    }
  });

  it("reuses the engine's viewBox per orientation", () => {
    const expected = {
      portrait: POSTER_SIZES.portrait,
      square: POSTER_SIZES.square,
      landscape: POSTER_SIZES.landscape,
    } as const;
    for (const p of PRINT_PRODUCTS) {
      expect(p.viewBox.w).toBe(expected[p.orientation].width);
      expect(p.viewBox.h).toBe(expected[p.orientation].height);
    }
  });

  it("keeps each print size's inches matching its viewBox ratio (no crop)", () => {
    for (const p of PRINT_PRODUCTS) {
      const inchRatio = p.widthIn / p.heightIn;
      const viewRatio = p.viewBox.w / p.viewBox.h;
      expect(inchRatio).toBeCloseTo(viewRatio, 5);
    }
  });
});

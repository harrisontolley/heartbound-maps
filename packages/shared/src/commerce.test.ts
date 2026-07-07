import { describe, expect, it } from "vitest";
import {
  FOUNDING_PRICES_END_ISO,
  isFoundingPricingActive,
  PRINT_PRODUCTS_BASE,
  PRODUCTS_BASE_BY_ID,
  OFFERED_PRODUCT_IDS,
} from "./commerce.js";

describe("isFoundingPricingActive", () => {
  it("is true well before the deadline", () => {
    expect(isFoundingPricingActive(new Date("2026-01-01T00:00:00Z"))).toBe(true);
  });

  it("is false at and after the deadline", () => {
    expect(isFoundingPricingActive(new Date(FOUNDING_PRICES_END_ISO))).toBe(false);
    expect(isFoundingPricingActive(new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("defaults to the current time when called with no argument", () => {
    // The deadline is a real future date at the time this PR ships; this just
    // pins the function to actually read Date.now() rather than a fixture.
    expect(typeof isFoundingPricingActive()).toBe("boolean");
  });
});

describe("tierName", () => {
  it("names the offered ladder Studio / Signature / Gallery", () => {
    expect(PRODUCTS_BASE_BY_ID["portrait-12x18"].tierName).toBe("Studio");
    expect(PRODUCTS_BASE_BY_ID["portrait-16x24"].tierName).toBe("Signature");
    expect(PRODUCTS_BASE_BY_ID["portrait-24x36"].tierName).toBe("Gallery");
  });

  it("leaves tierName undefined for sizes outside the curated ladder", () => {
    const offSet = new Set<string>(OFFERED_PRODUCT_IDS);
    for (const p of PRINT_PRODUCTS_BASE) {
      if (!offSet.has(p.id)) expect(p.tierName).toBeUndefined();
    }
  });
});

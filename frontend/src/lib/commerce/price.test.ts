import { describe, it, expect } from "vitest";
import {
  formatUsd,
  selectionTotalCents,
  selectionLineItems,
  buildSelection,
} from "./price";
import { PRODUCTS_BY_ID } from "./printProducts";
import { DIGITAL_PRICE_CENTS } from "./pricing";

const product = PRODUCTS_BY_ID["portrait-16x24"];

describe("formatUsd", () => {
  it("renders integer cents as US dollars", () => {
    expect(formatUsd(5900)).toBe("$59.00");
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("selectionTotalCents", () => {
  it("prints at the base price without a frame", () => {
    expect(
      selectionTotalCents({ format: "print", product, addFrame: false }),
    ).toBe(product.priceCents);
  });

  it("adds the per-size frame upcharge when framed", () => {
    expect(
      selectionTotalCents({ format: "print", product, addFrame: true }),
    ).toBe(product.priceCents + product.frameUpchargeCents);
  });

  it("is flat for digital regardless of the frame flag", () => {
    expect(
      selectionTotalCents({ format: "digital", product, addFrame: true }),
    ).toBe(DIGITAL_PRICE_CENTS);
  });
});

describe("selectionLineItems", () => {
  it("bundles a free digital with a print", () => {
    const items = selectionLineItems({
      format: "print",
      product,
      addFrame: false,
    });
    expect(items.map((i) => i.label)).toEqual([
      `${product.label} print`,
      "Digital download",
    ]);
    expect(items.at(-1)).toEqual({ label: "Digital download", cents: 0 });
  });

  it("includes the frame line when framed", () => {
    const items = selectionLineItems({
      format: "print",
      product,
      addFrame: true,
    });
    expect(items.map((i) => i.label)).toContain("Ready-to-hang frame");
  });

  it("is just the paid digital download in digital mode", () => {
    const items = selectionLineItems({
      format: "digital",
      product,
      addFrame: false,
    });
    expect(items).toEqual([
      { label: "Digital download", cents: DIGITAL_PRICE_CENTS },
    ]);
  });
});

describe("buildSelection", () => {
  it("forces the frame off and total flat when digital", () => {
    const sel = buildSelection({ format: "digital", product, addFrame: true });
    expect(sel.addFrame).toBe(false);
    expect(sel.totalCents).toBe(DIGITAL_PRICE_CENTS);
    expect(sel.productId).toBe(product.id);
  });

  it("snapshots a framed print total + size", () => {
    const sel = buildSelection({ format: "print", product, addFrame: true });
    expect(sel.totalCents).toBe(product.priceCents + product.frameUpchargeCents);
    expect(sel.size.label).toBe(product.label);
  });
});

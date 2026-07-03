import { describe, it, expect } from "vitest";
import {
  formatUsd,
  discountPercent,
  selectionTotalCents,
  selectionLineItems,
  buildSelection,
} from "./price";
import { PRODUCTS_BY_ID } from "./printProducts";
import { DIGITAL_PRICE_CENTS, DIGITAL_LIST_PRICE_CENTS } from "./pricing";

const product = PRODUCTS_BY_ID["portrait-16x24"];
const oakFrame = { material: "Oak" as const, color: "NaturalOak" as const };

describe("formatUsd", () => {
  it("renders integer cents as US dollars", () => {
    expect(formatUsd(5900)).toBe("$59.00");
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("discountPercent", () => {
  it("rounds the saving against the anchor to a whole percent", () => {
    expect(discountPercent(7900, 5900)).toBe(25);
    expect(discountPercent(2500, 1900)).toBe(24);
  });

  it("is 0 when there's nothing to advertise", () => {
    expect(discountPercent(5900, 5900)).toBe(0);
    expect(discountPercent(4000, 5900)).toBe(0);
  });

  it("floors rather than rounds so the badge never overstates the saving", () => {
    // 246/1000 = 24.6% — Math.round would inflate this to 25%; we must show 24%.
    expect(discountPercent(1000, 754)).toBe(24);
  });
});

describe("selectionTotalCents", () => {
  it("prints at the base price without a frame", () => {
    expect(
      selectionTotalCents({ format: "print", product, frame: null }),
    ).toBe(product.priceCents);
  });

  it("adds the per-size frame upcharge when framed, regardless of material/color", () => {
    expect(
      selectionTotalCents({ format: "print", product, frame: oakFrame }),
    ).toBe(product.priceCents + product.frameUpchargeCents);
    expect(
      selectionTotalCents({
        format: "print",
        product,
        frame: { material: "Metal", color: "GoldMetal" },
      }),
    ).toBe(product.priceCents + product.frameUpchargeCents);
  });

  it("is flat for digital regardless of the frame selection", () => {
    expect(
      selectionTotalCents({ format: "digital", product, frame: oakFrame }),
    ).toBe(DIGITAL_PRICE_CENTS);
  });
});

describe("selectionLineItems", () => {
  it("bundles a free digital with a print", () => {
    const items = selectionLineItems({
      format: "print",
      product,
      frame: null,
    });
    expect(items.map((i) => i.label)).toEqual([
      `${product.label} fine art print`,
      "Digital download",
    ]);
    expect(items.at(-1)).toEqual({ label: "Digital download", cents: 0 });
  });

  it("carries the print line's anchor (list) price for the strike-through", () => {
    const [printLine] = selectionLineItems({
      format: "print",
      product,
      frame: null,
    });
    expect(printLine.cents).toBe(product.priceCents);
    expect(printLine.listCents).toBe(product.listPriceCents);
  });

  it("includes the frame line, naming the chosen color, when framed", () => {
    const items = selectionLineItems({
      format: "print",
      product,
      frame: oakFrame,
    });
    expect(items.map((i) => i.label)).toContain("Ready-to-hang frame in Natural Oak");
  });

  it("is just the paid digital download in digital mode", () => {
    const items = selectionLineItems({
      format: "digital",
      product,
      frame: null,
    });
    expect(items).toEqual([
      {
        label: "Digital download",
        cents: DIGITAL_PRICE_CENTS,
        listCents: DIGITAL_LIST_PRICE_CENTS,
      },
    ]);
  });
});

describe("buildSelection", () => {
  it("forces the frame off and total flat when digital", () => {
    const sel = buildSelection({ format: "digital", product, frame: oakFrame });
    expect(sel.frame).toBeNull();
    expect(sel.totalCents).toBe(DIGITAL_PRICE_CENTS);
    expect(sel.productId).toBe(product.id);
  });

  it("snapshots a framed print total + size", () => {
    const sel = buildSelection({ format: "print", product, frame: oakFrame });
    expect(sel.totalCents).toBe(product.priceCents + product.frameUpchargeCents);
    expect(sel.size.label).toBe(product.label);
  });
});

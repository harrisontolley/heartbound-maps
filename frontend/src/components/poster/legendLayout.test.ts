import { describe, expect, it } from "vitest";
import { layoutLegend } from "./legendLayout";

const OPTS = { width: 1000, size: 19, labelSize: 19, gap: 9 };

describe("layoutLegend", () => {
  it("renders a typical 4-category legend at full size", () => {
    const l = layoutLegend({ ...OPTS, labels: ["Born", "Lived", "Visited", "Family"] });
    expect(l.scale).toBe(1);
    expect(l.size).toBe(19);
    expect(l.items).toHaveLength(4);
  });

  it("fits all 8 categories inside the safe width by scaling down (never below 0.72)", () => {
    const l = layoutLegend({
      ...OPTS,
      labels: [
        "Born",
        "Lived",
        "Studied",
        "Met",
        "Married",
        "Family",
        "Visited",
        "Adventure",
      ],
    });
    expect(l.scale).toBeLessThan(1);
    expect(l.scale).toBeGreaterThanOrEqual(0.72);
    // Whole row fits inside width - 2*margin.
    const last = l.items[l.items.length - 1];
    expect(last.textX + last.textW).toBeLessThanOrEqual(1000 - 40 + 1e-9);
    expect(l.items[0].iconX - l.size / 2).toBeGreaterThanOrEqual(40);
  });

  it("centers the row", () => {
    const l = layoutLegend({ ...OPTS, labels: ["Born", "Family"] });
    const left = l.items[0].iconX - l.size / 2;
    const right = l.items[1].textX + l.items[1].textW;
    expect(Math.abs(left - (1000 - right))).toBeLessThan(1);
  });

  it("keeps items in order, left to right, non-overlapping", () => {
    const l = layoutLegend({
      ...OPTS,
      labels: ["Born", "Lived", "Studied", "Met", "Married"],
    });
    for (let i = 1; i < l.items.length; i++) {
      const prev = l.items[i - 1];
      expect(l.items[i].iconX - l.size / 2).toBeGreaterThan(
        prev.textX + prev.textW,
      );
    }
  });

  it("returns no items for an empty legend", () => {
    expect(layoutLegend({ ...OPTS, labels: [] }).items).toHaveLength(0);
  });
});

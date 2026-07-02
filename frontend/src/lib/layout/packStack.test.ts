import { describe, it, expect } from "vitest";
import { packStackVertical } from "./packStack";

/** Helper: assert centers are non-decreasing and every consecutive gap is satisfied. */
function assertOrderedWithGaps(ys: number[], gaps: number[]) {
  for (let i = 0; i < ys.length - 1; i++) {
    expect(ys[i + 1] - ys[i]).toBeGreaterThanOrEqual(gaps[i] - 1e-6);
  }
}

describe("packStackVertical", () => {
  it("leaves already-separated targets untouched", () => {
    const ys = packStackVertical([100, 200], [50], [40, 40], 0, 1000);
    expect(ys).toEqual([100, 200]);
  });

  it("spreads too-close targets symmetrically to satisfy the gap", () => {
    const ys = packStackVertical([100, 110], [50], [40, 40], 0, 1000);
    // mean 105, gap 50 → 80 / 130
    expect(ys[0]).toBeCloseTo(80, 6);
    expect(ys[1]).toBeCloseTo(130, 6);
    assertOrderedWithGaps(ys, [50]);
  });

  it("repairs out-of-order targets into a non-decreasing stack", () => {
    const ys = packStackVertical([200, 100], [50], [40, 40], 0, 1000);
    expect(ys[0]).toBeLessThan(ys[1]);
    assertOrderedWithGaps(ys, [50]);
  });

  it("shifts the stack up to fit under the bottom bound", () => {
    const ys = packStackVertical([90, 95], [50], [40, 40], 0, 100);
    assertOrderedWithGaps(ys, [50]);
    expect(ys[0] - 20).toBeGreaterThanOrEqual(-1e-6); // top edge ≥ lo
    expect(ys[1] + 20).toBeLessThanOrEqual(100 + 1e-6); // bottom edge ≤ hi
  });

  it("honours a zero gap (no forced separation when boxes don't share x)", () => {
    const ys = packStackVertical([300, 305], [0], [40, 40], 0, 1000);
    expect(ys).toEqual([300, 305]);
  });

  it("handles three members: ordered, all gaps met, within bounds", () => {
    const gaps = [70, 70];
    const ys = packStackVertical([500, 510, 520], gaps, [64, 64, 64], 80, 1110);
    assertOrderedWithGaps(ys, gaps);
    expect(ys[0] - 32).toBeGreaterThanOrEqual(80 - 1e-6);
    expect(ys[2] + 32).toBeLessThanOrEqual(1110 + 1e-6);
  });
});

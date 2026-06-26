import { describe, it, expect } from "vitest";
import { distanceRadius } from "./magnitude";

describe("distanceRadius", () => {
  const dMin = 40;
  const dMax = 17000;
  const minR = 150;
  const maxR = 420;

  it("maps the nearest place to minRadius", () => {
    expect(distanceRadius(dMin, dMin, dMax, minR, maxR)).toBeCloseTo(minR, 9);
  });

  it("maps the farthest place to maxRadius", () => {
    expect(distanceRadius(dMax, dMin, dMax, minR, maxR)).toBeCloseTo(maxR, 9);
  });

  it("increases monotonically with distance", () => {
    const a = distanceRadius(100, dMin, dMax, minR, maxR);
    const b = distanceRadius(800, dMin, dMax, minR, maxR);
    const c = distanceRadius(9000, dMin, dMax, minR, maxR);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("stays within [minRadius, maxRadius] for in-range distances", () => {
    for (const d of [40, 100, 800, 5000, 17000]) {
      const r = distanceRadius(d, dMin, dMax, minR, maxR);
      expect(r).toBeGreaterThanOrEqual(minR);
      expect(r).toBeLessThanOrEqual(maxR);
    }
  });

  it("compresses the range (a mid-distance place is not crushed to the floor)", () => {
    // 800km sits ~halfway on a log scale between 40km and 17000km, far above the
    // floor a linear map would give it — this is the 'compressed' behaviour.
    const r = distanceRadius(800, dMin, dMax, minR, maxR);
    const mid = (minR + maxR) / 2;
    expect(r).toBeGreaterThan(minR + (maxR - minR) * 0.3);
    expect(Math.abs(r - mid)).toBeLessThan((maxR - minR) * 0.2);
  });

  it("clamps out-of-range distances and never returns NaN", () => {
    expect(distanceRadius(10, dMin, dMax, minR, maxR)).toBe(minR);
    expect(distanceRadius(99999, dMin, dMax, minR, maxR)).toBe(maxR);
    for (const d of [10, 40, 800, 99999]) {
      expect(Number.isNaN(distanceRadius(d, dMin, dMax, minR, maxR))).toBe(false);
    }
  });
});

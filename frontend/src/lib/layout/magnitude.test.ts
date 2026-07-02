import { describe, it, expect } from "vitest";
import { distanceRadius } from "./magnitude";

describe("distanceRadius (proportional log map)", () => {
  const minR = 150;
  const maxR = 420;

  it("maps the farthest place to maxRadius", () => {
    expect(distanceRadius(17000, 40, 17000, minR, maxR)).toBeCloseTo(maxR, 9);
    expect(distanceRadius(5510, 5210, 5510, minR, maxR)).toBeCloseTo(maxR, 9);
  });

  it("uses the FULL range only when the distance ratio reaches ratioFull", () => {
    // 40 → 17000 km is a 425× ratio — far past ratioFull, so full spread.
    expect(distanceRadius(40, 40, 17000, minR, maxR)).toBeCloseTo(minR, 9);
    // Exactly ratioFull (8×) also gets the full spread.
    expect(distanceRadius(1000, 1000, 8000, minR, maxR, 8)).toBeCloseTo(minR, 9);
  });

  it("keeps near-equal distances at near-equal radii (Jakarta → AU east coast)", () => {
    // 5210 vs 5510 km (~6% apart) must NOT be stretched to the full range.
    const near = distanceRadius(5210, 5210, 5510, minR, maxR);
    const far = distanceRadius(5510, 5210, 5510, minR, maxR);
    expect(far).toBeCloseTo(maxR, 9);
    expect(far - near).toBeLessThan((maxR - minR) * 0.05);
    expect(near).toBeLessThan(far); // still ordered
  });

  it("scales the used range with the log of the distance ratio", () => {
    // ratio ~1.3 → spread ≈ log(1.3)/log(8) ≈ 12.6% of the range.
    const lo = distanceRadius(1000, 1000, 1300, minR, maxR);
    expect(maxR - lo).toBeGreaterThan((maxR - minR) * 0.08);
    expect(maxR - lo).toBeLessThan((maxR - minR) * 0.25);
  });

  it("increases monotonically with distance", () => {
    const a = distanceRadius(100, 40, 17000, minR, maxR);
    const b = distanceRadius(800, 40, 17000, minR, maxR);
    const c = distanceRadius(9000, 40, 17000, minR, maxR);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("stays within [minRadius, maxRadius] and never returns NaN", () => {
    for (const d of [10, 40, 100, 800, 5000, 17000, 99999]) {
      const r = distanceRadius(d, 40, 17000, minR, maxR);
      expect(r).toBeGreaterThanOrEqual(minR);
      expect(r).toBeLessThanOrEqual(maxR);
      expect(Number.isNaN(r)).toBe(false);
    }
  });

  it("returns maxRadius when there is no range to scale across", () => {
    expect(distanceRadius(500, 500, 500, minR, maxR)).toBe(maxR);
  });
});

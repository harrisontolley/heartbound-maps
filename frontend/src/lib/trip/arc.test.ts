import { describe, it, expect } from "vitest";
import { arcControlPoint, buildArcPath } from "./arc";

const A = { x: 100, y: 300 };
const B = { x: 500, y: 300 };

describe("arcControlPoint", () => {
  it("bows towards the top of the canvas (smaller y than the chord)", () => {
    const c = arcControlPoint(A, B, 0.2);
    expect(c.y).toBeLessThan(300);
    expect(c.x).toBeCloseTo(300, 6); // midpoint x for a horizontal chord
  });
  it("returns the plain midpoint for zero curvature", () => {
    expect(arcControlPoint(A, B, 0)).toEqual({ x: 300, y: 300 });
  });
  it("returns the midpoint for a zero-length leg", () => {
    expect(arcControlPoint(A, A, 0.2)).toEqual({ x: 100, y: 300 });
  });
});

describe("buildArcPath", () => {
  it("is a straight line at zero curvature", () => {
    const d = buildArcPath(A, B, 0);
    expect(d).toBe("M100 300L500 300");
  });
  it("is a quadratic curve through a bowed control point otherwise", () => {
    const d = buildArcPath(A, B, 0.2);
    expect(d.startsWith("M100 300Q")).toBe(true);
    expect(d.endsWith("500 300")).toBe(true);
    expect(d).toContain("Q");
  });
  it("degrades to a straight (degenerate) path for a zero-length leg", () => {
    expect(buildArcPath(A, A, 0.2)).toBe("M100 300L100 300");
  });
});

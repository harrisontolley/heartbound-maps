import { describe, expect, it } from "vitest";
import { quadToMatrix3d, type Point, type Quad } from "./perspective";

/** Parse the 16 numbers out of a `matrix3d(...)` string. */
function parse(matrix: string): number[] {
  const nums = matrix
    .slice("matrix3d(".length, -1)
    .split(",")
    .map((s) => Number(s.trim()));
  expect(nums).toHaveLength(16);
  return nums;
}

/** Apply a column-major 4×4 CSS matrix to (x, y, 0, 1) and perspective-divide. */
function project(matrix: string, x: number, y: number): Point {
  const m = parse(matrix);
  const X = m[0] * x + m[4] * y + m[12];
  const Y = m[1] * x + m[5] * y + m[13];
  const W = m[3] * x + m[7] * y + m[15];
  return [X / W, Y / W];
}

function expectClose(a: Point, b: Point) {
  // Subpixel agreement is plenty for compositing onto a photo.
  expect(a[0]).toBeCloseTo(b[0], 2);
  expect(a[1]).toBeCloseTo(b[1], 2);
}

describe("quadToMatrix3d", () => {
  it("maps the source rectangle to an identity transform", () => {
    const w = 1000;
    const h = 1500;
    const corners: Quad = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    expect(quadToMatrix3d(corners, w, h)).toBe(
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
    );
  });

  it("sends each source corner onto its destination corner", () => {
    const w = 1000;
    const h = 1500;
    // An asymmetric trapezoid (top narrower than bottom, slight tilt) — a real
    // perspective quad, not an affine one.
    const corners: Quad = [
      [120, 60], // TL
      [880, 110], // TR
      [960, 1440], // BR
      [40, 1390], // BL
    ];
    const matrix = quadToMatrix3d(corners, w, h);
    expectClose(project(matrix, 0, 0), corners[0]);
    expectClose(project(matrix, w, 0), corners[1]);
    expectClose(project(matrix, w, h), corners[2]);
    expectClose(project(matrix, 0, h), corners[3]);
  });

  it("interpolates a midpoint along a straight edge (lines stay straight)", () => {
    const w = 100;
    const h = 200;
    // Pure affine (parallelogram) → edge midpoints map linearly.
    const corners: Quad = [
      [10, 10],
      [110, 30],
      [130, 230],
      [30, 210],
    ];
    const matrix = quadToMatrix3d(corners, w, h);
    // Midpoint of the top edge of the source maps to midpoint of TL..TR.
    expectClose(project(matrix, w / 2, 0), [
      (corners[0][0] + corners[1][0]) / 2,
      (corners[0][1] + corners[1][1]) / 2,
    ]);
  });

  it("returns identity for a degenerate (zero-size) container", () => {
    const corners: Quad = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    expect(quadToMatrix3d(corners, 0, 0)).toBe(
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
    );
  });
});

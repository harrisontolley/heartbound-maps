/**
 * Perspective ("homography") helper for compositing a flat element onto a tilted
 * surface in a photo — e.g. flowing the live poster SVG onto the angled frame in a
 * room mockup. Pure + framework-agnostic so it's unit-tested like the other lib/*
 * modules.
 *
 * Maps the element's own source rectangle (0,0)-(w,0)-(w,h)-(0,h) onto four arbitrary
 * destination corners and returns the CSS `matrix3d(...)` that performs it. Apply the
 * element with `transform-origin: 0 0`.
 *
 * The math is the classic 4-point projective transform: compose the unit-basis →
 * source map with the (inverted) unit-basis → destination map to get a 3×3 homography,
 * then embed it into the 4×4 column-major matrix CSS expects.
 */

/** A point in pixels: [x, y]. */
export type Point = [number, number];

/** Destination corners in [topLeft, topRight, bottomRight, bottomLeft] order. */
export type Quad = [Point, Point, Point, Point];

/** Adjugate (classical adjoint) of a 3×3 matrix in row-major order. */
function adjugate(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

/** Multiply two 3×3 matrices (row-major). */
function multmm(a: number[], b: number[]): number[] {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += a[3 * i + k] * b[3 * k + j];
      r[3 * i + j] = sum;
    }
  }
  return r;
}

/** Multiply a 3×3 matrix by a 3-vector (row-major). */
function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** 3×3 map taking the unit-square basis to the four given points. */
function basisToPoints(p: Quad): number[] {
  const [a, b, c, d] = p;
  const m = [a[0], b[0], c[0], a[1], b[1], c[1], 1, 1, 1];
  const v = multmv(adjugate(m), [d[0], d[1], 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/** 3×3 homography mapping the `src` quad onto the `dst` quad. */
function projection(src: Quad, dst: Quad): number[] {
  return multmm(basisToPoints(dst), adjugate(basisToPoints(src)));
}

/**
 * CSS `matrix3d(...)` that maps an element's `w`×`h` rectangle onto `corners`
 * (top-left, top-right, bottom-right, bottom-left, in pixels). Returns the identity
 * matrix string when the mapping is degenerate (e.g. a zero-size container).
 */
export function quadToMatrix3d(corners: Quad, w: number, h: number): string {
  const src: Quad = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const t = projection(src, corners);

  // Normalize so t[8] === 1; bail to identity if degenerate.
  if (!Number.isFinite(t[8]) || Math.abs(t[8]) < 1e-9) {
    return "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)";
  }
  for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];

  // Row-major 3×3 homography → column-major 4×4 (z untouched).
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0,    0,    1, 0,
    t[2], t[5], 0, t[8],
  ];
  return `matrix3d(${m.map((n) => roundForCss(n)).join(",")})`;
}

/**
 * Trim float noise so the emitted string stays compact and stable. Kept at 9
 * decimals: the perspective terms are tiny (~1e-4) but get multiplied by the
 * element's full pixel width, so over-rounding them visibly shifts the far corners.
 */
function roundForCss(n: number): number {
  const r = Math.round(n * 1e9) / 1e9;
  return Object.is(r, -0) ? 0 : r;
}

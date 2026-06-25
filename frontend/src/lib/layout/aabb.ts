type Rect = { x: number; y: number; w: number; h: number };

/**
 * Axis-aligned rectangle intersection. `pad` expands each rectangle by that many
 * pixels on every side, so a positive pad keeps labels from merely touching.
 */
export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

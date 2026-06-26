import type { Vec2 } from "../geo/projection";

/**
 * Control point for the quadratic Bézier between two stops: the chord midpoint
 * pushed perpendicular by `curvature * legLength`. The bow always leans towards
 * the top of the canvas (−y) so a multi-leg route reads as one coherent line.
 * Returns the plain midpoint for a degenerate leg or zero curvature.
 */
export function arcControlPoint(p1: Vec2, p2: Vec2, curvature: number): Vec2 {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6 || curvature === 0) return { x: mx, y: my };

  let nx = -dy / dist;
  let ny = dx / dist;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: mx + nx * curvature * dist, y: my + ny * curvature * dist };
}

/**
 * SVG path `d` for a flight-path leg. With curvature 0 (or a zero-length leg)
 * it degrades to a straight line.
 */
export function buildArcPath(p1: Vec2, p2: Vec2, curvature = 0.18): string {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (dist < 1e-6 || curvature === 0) {
    return `M${fmt(p1.x)} ${fmt(p1.y)}L${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  const c = arcControlPoint(p1, p2, curvature);
  return `M${fmt(p1.x)} ${fmt(p1.y)}Q${fmt(c.x)} ${fmt(c.y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

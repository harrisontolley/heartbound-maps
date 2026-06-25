import type { LayoutConfig } from "./types";
import { posterGeometry, POSTER_MARGIN } from "@/lib/poster/geometry";

/**
 * Default layout tuning for a poster. The compass center + safe radius come from
 * the shared `posterGeometry` so the renderer and the collision engine agree for
 * any aspect ratio. `baseRadius` is clamped to the safe radius so short/landscape
 * frames don't start arrows outside the drawing area.
 */
export function defaultLayoutConfig(
  width: number,
  height: number,
  overrides: Partial<LayoutConfig> = {},
): LayoutConfig {
  const { cx, cy, maxRadius } = posterGeometry(width, height);
  return {
    width,
    height,
    cx,
    cy,
    margin: POSTER_MARGIN,
    homeRadius: 46,
    baseRadius: Math.min(260, maxRadius),
    maxRadius,
    clusterAngleDeg: 7,
    // Must exceed a label's height (+padding) so a vertical signpost stack
    // separates by radius alone, without needing the relaxation fallback.
    radiusStep: 70,
    labelGap: 16,
    pushStep: 10,
    perpStep: 12,
    maxIters: 600,
    boxPadding: 6,
    ...overrides,
  };
}

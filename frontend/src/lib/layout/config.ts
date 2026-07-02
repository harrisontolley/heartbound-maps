import type { LayoutConfig } from "./types";
import { posterGeometry, contentSafeRect, POSTER_MARGIN } from "@/lib/poster/geometry";

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
    // Distance scaling: the farthest place lands on `maxRadius`; how far DOWN
    // the range the nearest place goes is proportional to the set's distance
    // ratio (see magnitude.ts), so near-equal distances get near-equal arrows.
    scaleByDistance: true,
    minRadius: Math.min(150, maxRadius),
    // dMax/dMin at which the full radius range is used.
    ratioFull: 8,
    clusterAngleDeg: 7,
    // Must exceed a label's height (+padding) so a vertical signpost stack
    // separates by radius alone where the caps allow it.
    radiusStep: 70,
    labelGap: 16,
    // Labels stay above the reserved bottom band (title / coords / legend / footer).
    safeBottom: contentSafeRect(width, height, POSTER_MARGIN).maxY,
    // Rest state: the affiliation icon marks the tip just past the arrowhead.
    iconAtTip: true,
    tipIconGap: 26,
    anchorDeadzone: 0.15,
    // Small drifts keep the icon readably "at" its tip without leader-line noise;
    // only real displacement earns a leader.
    leaderThreshold: 24,
    lineClearance: 6,
    // Gap between a conflict group's outermost arrow tip and its label column.
    colGap: 24,
    // Fixpoint pass cap — each pass merges at least two conflict groups, so
    // n places can never need more than n passes. Backstop, not a tuning knob.
    maxIters: 64,
    boxPadding: 6,
    // Vertical breathing room between labels stacked by the pack resolvers.
    clusterStackPad: 6,
    ...overrides,
  };
}

import type { Computed } from "../types";
import type { Vec2 } from "../geo/projection";

export type TextAnchor = "start" | "end" | "middle";

/** Axis-aligned box (top-left + size) plus the SVG text anchor info. */
export type LabelBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  anchor: TextAnchor;
  /** Anchor point for the SVG <text> element (where the label "attaches"). */
  anchorX: number;
  anchorY: number;
};

/** A place resolved to concrete poster geometry. */
export type LaidOut = Computed & {
  /** Screen-space unit vector for the true bearing (North = up). Never altered. */
  dir: Vec2;
  /** Resolved arrow length in px (adjusted to avoid collisions). */
  radius: number;
  /** Perpendicular offset applied as a last-resort nudge (px, signed). */
  perp: number;
  /** Arrowhead position. */
  tip: Vec2;
  labelBox: LabelBox;
  /** True when the label was nudged off its spoke and needs a leader line. */
  needsLeader: boolean;
};

export type LayoutConfig = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  margin: number;
  /** Inner gap so arrows start outside the home marker. */
  homeRadius: number;
  /** Default arrow length. */
  baseRadius: number;
  /** Max arrow length (keeps labels inside the safe area). */
  maxRadius: number;
  /** Bearings within this many degrees form a "same direction" cluster. */
  clusterAngleDeg: number;
  /** Radius stagger between stacked labels in a cluster. */
  radiusStep: number;
  /** Gap between arrow tip and label anchor. */
  labelGap: number;
  /** Outward push per relaxation step. */
  pushStep: number;
  /** Perpendicular nudge per relaxation step (last resort). */
  perpStep: number;
  maxIters: number;
  /** Breathing room added around each label box for the overlap test. */
  boxPadding: number;
};

export type LabelSize = { w: number; h: number };

/** Measures a place's two-line label box for the active template/font. */
export type MeasureFn = (item: Computed) => LabelSize;

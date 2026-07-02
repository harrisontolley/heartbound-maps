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
  /** Legacy field, always 0 — kept so the public shape is stable. */
  perp: number;
  /** Arrowhead position. */
  tip: Vec2;
  labelBox: LabelBox;
  /** True when the label was moved off its rest position and needs a leader line. */
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
  /** Default arrow length (used when distance scaling is off). */
  baseRadius: number;
  /** Max arrow length (keeps labels inside the safe area). */
  maxRadius: number;
  /** When true, arrow length encodes distance (farther = longer). */
  scaleByDistance: boolean;
  /** Floor arrow length for the nearest place when distance scaling is on. */
  minRadius: number;
  /**
   * Distance ratio (dMax/dMin) at which the full [minRadius, maxRadius] range is
   * used. Near-equal distance sets use a proportionally narrower band anchored
   * at maxRadius, so similar distances get similar arrow lengths.
   */
  ratioFull: number;
  /** Bearings within this many degrees form a "same direction" cluster. */
  clusterAngleDeg: number;
  /** Radius stagger between stacked labels in a cluster. */
  radiusStep: number;
  /** Gap between arrow tip and label anchor (used when `iconAtTip` is off). */
  labelGap: number;
  /**
   * Bottom bound for label boxes — the title/legend/footer band top
   * (`height - BOTTOM_BAND`), so labels never sit over the bottom text block.
   */
  safeBottom: number;
  /**
   * When true, the rest position pins the affiliation icon's center at
   * `tip + dir * tipIconGap` (the icon marks the tip, just past the arrowhead),
   * with name + distance flowing outward. When false, the legacy `labelGap`
   * placement is used.
   */
  iconAtTip: boolean;
  /** Tip → icon-center offset along the arrow when `iconAtTip` is on. */
  tipIconGap: number;
  /**
   * |dir.x| below this counts as "near vertical" → the label is centered
   * (anchor "middle") rather than left/right anchored.
   */
  anchorDeadzone: number;
  /** Displacement from the rest center beyond which a leader line is drawn. */
  leaderThreshold: number;
  /** Clearance kept between a label box and other arrows' spokes. */
  lineClearance: number;
  /** Horizontal gap between a conflict group's outermost tip and its label column. */
  colGap: number;
  /** Cap on conflict-resolution fixpoint passes (backstop, not a tuning knob). */
  maxIters: number;
  /** Breathing room added around each label box for the overlap test. */
  boxPadding: number;
  /** Vertical breathing room between same-direction labels stacked in a cluster. */
  clusterStackPad: number;
};

export type LabelSize = { w: number; h: number };

/** Measures a place's two-line label box for the active template/font. */
export type MeasureFn = (item: Computed) => LabelSize;

/**
 * Optional diagnostics the engine can fill in for the tuning lab. Passing a
 * `LayoutDiagnostics` object as `computeLayout`'s 4th argument has it mutated in
 * place; omitting it (the production path) costs nothing.
 */
export type LayoutDiagnostics = {
  /** Conflict-resolution fixpoint passes run. */
  iterations: number;
  /** True if the fixpoint reached a conflict-free layout. */
  converged: boolean;
  /** True if every label stayed at its rest position (no conflict groups). */
  primaryResolved: boolean;
  /** True if any group needed the outward-column strategy (or the last resort). */
  fallbackUsed: boolean;
  /** Each label's rest (no-collision) center, keyed by place id. */
  restCenters: Record<string, { x: number; y: number }>;
  /** Pairs of place ids whose boxes still overlap (should be empty on feasible posters). */
  overlapPairs: [string, string][];
  /** Ids of any boxes still poking outside the content-safe rect. */
  offPage: string[];
};

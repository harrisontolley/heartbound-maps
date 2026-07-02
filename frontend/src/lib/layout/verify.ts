import { rectsOverlap, segIntersectsRect } from "./aabb";
import type { LabelBox, LaidOut, LayoutConfig } from "./types";

/**
 * Pure invariant predicates over a resolved layout. Shared by the engine's
 * fixpoint loop, the unit tests, and the visual render harness so "correct"
 * means exactly one thing everywhere.
 */

export type Vec = { x: number; y: number };

/** Pairs of indices whose label boxes overlap at `pad`. */
export function boxOverlapPairs(laid: LaidOut[], pad: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < laid.length; i++) {
    for (let j = i + 1; j < laid.length; j++) {
      if (rectsOverlap(laid[i].labelBox, laid[j].labelBox, pad)) pairs.push([i, j]);
    }
  }
  return pairs;
}

/**
 * Does this label's OWN arrow cross its text? Strict predicate: the shaft
 * segment enters the box AND the box's most-inward corner projects less than
 * `radius` along the arrow direction (i.e. part of the box lies inward of the
 * tip, so the shaft/arrowhead is inside it). Using the inner-corner projection
 * (not the box center) catches the case where only the icon half of the box
 * crosses the shaft while the center is still outward.
 */
export function ownArrowHit(l: LaidOut, center: Vec, pad = 0): boolean {
  if (!segIntersectsRect(center, l.tip, l.labelBox, pad)) return false;
  const b = l.labelBox;
  const proj = (x: number, y: number) => (x - center.x) * l.dir.x + (y - center.y) * l.dir.y;
  const pMin = Math.min(
    proj(b.x, b.y),
    proj(b.x + b.w, b.y),
    proj(b.x, b.y + b.h),
    proj(b.x + b.w, b.y + b.h),
  );
  return pMin < l.radius;
}

/** Does label `i`'s box sit on any OTHER arrow's spoke (center → tip)? */
export function otherArrowHits(
  laid: LaidOut[],
  i: number,
  center: Vec,
  pad: number,
): number[] {
  const hits: number[] = [];
  for (let j = 0; j < laid.length; j++) {
    if (j === i) continue;
    if (segIntersectsRect(center, laid[j].tip, laid[i].labelBox, pad)) hits.push(j);
  }
  return hits;
}

/** Is the box fully inside the content-safe rect (margins + bottom band)? */
export function inSafeRect(b: LabelBox, cfg: LayoutConfig, eps = 1e-6): boolean {
  return (
    b.x >= cfg.margin - eps &&
    b.y >= cfg.margin - eps &&
    b.x + b.w <= cfg.width - cfg.margin + eps &&
    b.y + b.h <= cfg.safeBottom + eps
  );
}

/** Does the box intrude into the home-marker keep-out disc? */
export function hitsHomeDisc(b: LabelBox, center: Vec, homeRadius: number): boolean {
  const qx = Math.max(b.x, Math.min(center.x, b.x + b.w));
  const qy = Math.max(b.y, Math.min(center.y, b.y + b.h));
  return Math.hypot(qx - center.x, qy - center.y) < homeRadius;
}

/** Do two segments properly intersect? (shared-endpoint touches don't count) */
function segsCross(a1: Vec, a2: Vec, b1: Vec, b2: Vec): boolean {
  const d = (p: Vec, q: Vec, r: Vec) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = d(b1, b2, a1);
  const d2 = d(b1, b2, a2);
  const d3 = d(a1, a2, b1);
  const d4 = d(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Leader segment for a displaced label: tip → its box attach point. */
function leaderSeg(l: LaidOut): [Vec, Vec] {
  return [l.tip, { x: l.labelBox.anchorX, y: l.labelBox.anchorY }];
}

/**
 * Count visual crossings involving leader lines: leader × other spokes,
 * leader × other leaders, and leader × other label boxes. Zero on a clean
 * poster; the harness scoreboard surfaces any residual.
 */
export function leaderCrossings(laid: LaidOut[], center: Vec): number {
  let count = 0;
  for (let i = 0; i < laid.length; i++) {
    if (!laid[i].needsLeader) continue;
    const [a1, a2] = leaderSeg(laid[i]);
    for (let j = 0; j < laid.length; j++) {
      if (j === i) continue;
      if (segsCross(a1, a2, center, laid[j].tip)) count++;
      if (segIntersectsRect(a1, a2, laid[j].labelBox, 0)) count++;
      if (j > i && laid[j].needsLeader) {
        const [b1, b2] = leaderSeg(laid[j]);
        if (segsCross(a1, a2, b1, b2)) count++;
      }
    }
  }
  return count;
}

export type VerifyProblem =
  | { kind: "box-overlap"; a: string; b: string }
  | { kind: "own-arrow"; id: string }
  | { kind: "other-arrow"; id: string; arrow: string }
  | { kind: "off-page"; id: string }
  | { kind: "home-disc"; id: string };

/** Run every hard invariant; returns an empty list for a clean layout. */
export function verifyLayout(laid: LaidOut[], cfg: LayoutConfig): VerifyProblem[] {
  const center = { x: cfg.cx, y: cfg.cy };
  const problems: VerifyProblem[] = [];
  for (const [i, j] of boxOverlapPairs(laid, cfg.boxPadding)) {
    problems.push({ kind: "box-overlap", a: laid[i].id, b: laid[j].id });
  }
  for (let i = 0; i < laid.length; i++) {
    if (ownArrowHit(laid[i], center)) problems.push({ kind: "own-arrow", id: laid[i].id });
    for (const j of otherArrowHits(laid, i, center, cfg.lineClearance)) {
      problems.push({ kind: "other-arrow", id: laid[i].id, arrow: laid[j].id });
    }
    if (!inSafeRect(laid[i].labelBox, cfg)) problems.push({ kind: "off-page", id: laid[i].id });
    if (hitsHomeDisc(laid[i].labelBox, center, cfg.homeRadius)) {
      problems.push({ kind: "home-disc", id: laid[i].id });
    }
  }
  return problems;
}

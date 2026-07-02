import { rectsOverlap, segIntersectsRect } from "./aabb";
import { packStackVertical } from "./packStack";
import { clustersByBearing, minVisibleRadius } from "./radii";
import type { LaidOut, LayoutConfig } from "./types";
import { hitsHomeDisc, inSafeRect, ownArrowHit } from "./verify";

/**
 * Conflict-group resolvers. A group is a connected component of rest-position
 * conflicts (see `conflicts.ts`). Two strategies, tried in order:
 *
 *  1. In-place vertical pack — labels keep their x / anchor (staying at their
 *     own tips) and only slide vertically, in tip order, each pair splitting
 *     the difference (isotonic pack). Accepted only if the result validates
 *     against *everything* (all boxes, all spokes, page bounds).
 *
 *  2. Outward ordered column — the tidy fallback for same-direction fans:
 *     labels form a flush column just outside the group's tips, vertically
 *     packed in tip order, with short split leaders. Arrows are shortened as
 *     needed so the column always fits the margins ("shorten the arrow, never
 *     clamp the label"), and a crossing-repair pass shortens any arrow that
 *     would slice through a sibling's leader.
 */

const MIN_SPOKE_SEP = 24;
const EPS = 1e-9;

function setTip(l: LaidOut, cfg: LayoutConfig): void {
  l.tip = { x: cfg.cx + l.dir.x * l.radius, y: cfg.cy + l.dir.y * l.radius };
}

/** Deterministic slot order: top tip first; ties → longer arrow first, then id. */
function slotOrder(members: LaidOut[]): LaidOut[] {
  return [...members].sort(
    (a, b) => a.tip.y - b.tip.y || b.radius - a.radius || (a.id < b.id ? -1 : 1),
  );
}

function stackGap(cfg: LayoutConfig): number {
  return cfg.boxPadding + cfg.clusterStackPad;
}

/** Validate one member's box against every obstacle in the poster. */
function boxValid(laid: LaidOut[], idx: number, cfg: LayoutConfig): boolean {
  const center = { x: cfg.cx, y: cfg.cy };
  const l = laid[idx];
  if (!inSafeRect(l.labelBox, cfg)) return false;
  if (ownArrowHit(l, center)) return false;
  if (hitsHomeDisc(l.labelBox, center, cfg.homeRadius)) return false;
  for (let j = 0; j < laid.length; j++) {
    if (j === idx) continue;
    if (rectsOverlap(l.labelBox, laid[j].labelBox, cfg.boxPadding)) return false;
    if (segIntersectsRect(center, laid[j].tip, l.labelBox, cfg.lineClearance)) return false;
  }
  return true;
}

/**
 * The y-intervals a member's box center must avoid so the box clears every
 * arrow shaft crossing its (fixed) x-range. Spokes don't move during the
 * in-place pack, so these are absolute constraints.
 */
function forbiddenYIntervals(
  m: LaidOut,
  laid: LaidOut[],
  cfg: LayoutConfig,
): [number, number][] {
  const clear = cfg.lineClearance + 2;
  const b = m.labelBox;
  const x0 = b.x - clear;
  const x1 = b.x + b.w + clear;
  const out: [number, number][] = [];
  for (const o of laid) {
    const dx = o.tip.x - cfg.cx;
    const dy = o.tip.y - cfg.cy;
    let t0 = 0;
    let t1 = 1;
    if (Math.abs(dx) < EPS) {
      if (cfg.cx < x0 || cfg.cx > x1) continue; // vertical spoke outside the box
    } else {
      const ta = (x0 - cfg.cx) / dx;
      const tb = (x1 - cfg.cx) / dx;
      t0 = Math.max(0, Math.min(ta, tb));
      t1 = Math.min(1, Math.max(ta, tb));
      if (t0 > t1) continue; // spoke never enters the box's x-range
    }
    const ya = cfg.cy + dy * t0;
    const yb = cfg.cy + dy * t1;
    out.push([
      Math.min(ya, yb) - clear - b.h / 2,
      Math.max(ya, yb) + clear + b.h / 2,
    ]);
  }
  return out;
}

/** Merge overlapping intervals (returns a sorted disjoint union). */
function mergeIntervals(iv: [number, number][]): [number, number][] {
  const sorted = [...iv].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1e-9) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Nearest value to `y` inside [lo, hi] but outside every forbidden interval,
 * or null when the intervals swallow the whole band. */
function snapPast(
  y: number,
  intervals: [number, number][],
  lo: number,
  hi: number,
): number | null {
  const clampBand = (v: number) => Math.min(Math.max(v, lo), hi);
  let best: number | null = null;
  const consider = (v: number) => {
    if (v < lo - 1e-9 || v > hi + 1e-9) return;
    if (intervals.some(([a, b]) => v > a + 1e-9 && v < b - 1e-9)) return;
    if (best === null || Math.abs(v - y) < Math.abs(best - y)) best = v;
  };
  consider(clampBand(y));
  for (const [a, b] of intervals) {
    consider(a);
    consider(b);
  }
  return best;
}

/**
 * Intuitive ordering inside a same-direction cluster: a label may sit above a
 * sibling's only if its arrow's tip is higher OR its bearing is more northerly
 * (angular order). Same-bearing stacks must strictly follow tip order.
 */
export function groupOrderOk(ms: LaidOut[], cfg: LayoutConfig): boolean {
  for (const cluster of clustersByBearing(ms, cfg.clusterAngleDeg)) {
    for (let i = 0; i < cluster.length; i++) {
      for (let j = 0; j < cluster.length; j++) {
        if (i === j) continue;
        const a = cluster[i];
        const b = cluster[j];
        const ac = a.labelBox.y + a.labelBox.h / 2;
        const bc = b.labelBox.y + b.labelBox.h / 2;
        if (ac >= bc - 1e-6) continue; // only judge "a above b" pairs
        const tipOk = a.tip.y <= b.tip.y + 1e-6;
        const angleOk = a.dir.y < b.dir.y - 1e-9;
        if (!tipOk && !angleOk) return false;
      }
    }
  }
  return true;
}

/** Would this member's leader (tip → nearest box point) cross any other
 * arrow's spoke or any other label box? */
function leaderCrosses(m: LaidOut, laid: LaidOut[], cfg: LayoutConfig): boolean {
  const center = { x: cfg.cx, y: cfg.cy };
  const b = m.labelBox;
  const attach = {
    x: Math.min(Math.max(m.tip.x, b.x), b.x + b.w),
    y: Math.min(Math.max(m.tip.y, b.y), b.y + b.h),
  };
  for (const o of laid) {
    if (o === m) continue;
    if (segCrossParam(center, o.tip, m.tip, attach) !== null) return true;
    if (segIntersectsRect(m.tip, attach, o.labelBox, 0)) return true;
  }
  return false;
}

/**
 * Strategy 1: keep every member at its own tip (x + anchor untouched) and slide
 * boxes only vertically, packing them in tip order so conflicting neighbours
 * split the difference. Arrow shafts are FIXED during this strategy, so a box
 * whose x-range a shaft crosses must sit entirely above or below it — the
 * resolver enumerates those side choices (nearest side first) for the few
 * affected members and keeps the first arrangement that fully validates
 * (boxes, spokes, page bounds, home disc, and leader crossings) against the
 * whole poster. Restores rest positions and returns false when nothing clean
 * exists — the column strategy takes over.
 */
export function tryInPlacePack(members: number[], laid: LaidOut[], cfg: LayoutConfig): boolean {
  const ms = members.map((i) => laid[i]);
  const snapshot = ms.map((m) => m.labelBox.y);
  const restCenter = new Map(ms.map((m) => [m.id, m.labelBox.y + m.labelBox.h / 2]));
  const band = (m: LaidOut): [number, number] => [
    cfg.margin + m.labelBox.h / 2,
    cfg.safeBottom - m.labelBox.h / 2,
  ];
  const xOverlap = (a: LaidOut, b: LaidOut) =>
    a.labelBox.x - cfg.boxPadding < b.labelBox.x + b.labelBox.w &&
    a.labelBox.x + a.labelBox.w + cfg.boxPadding > b.labelBox.x;

  const attempt = (targets: Map<string, number>): boolean => {
    const order = [...ms].sort(
      (a, b) =>
        targets.get(a.id)! - targets.get(b.id)! ||
        a.tip.y - b.tip.y ||
        b.radius - a.radius ||
        (a.id < b.id ? -1 : 1),
    );
    const heights = order.map((m) => m.labelBox.h);
    const gaps = order.slice(0, -1).map((m, k) =>
      xOverlap(m, order[k + 1]) ? (heights[k] + heights[k + 1]) / 2 + stackGap(cfg) : 0,
    );
    const ys = packStackVertical(
      order.map((m) => targets.get(m.id)!),
      gaps,
      heights,
      cfg.margin,
      cfg.safeBottom,
    );
    order.forEach((m, k) => {
      m.labelBox.y = ys[k] - m.labelBox.h / 2;
    });
    // The pack may have slid a box back onto a shaft — snap it clear.
    for (const m of order) {
      const intervals = mergeIntervals(forbiddenYIntervals(m, laid, cfg));
      const c = m.labelBox.y + m.labelBox.h / 2;
      if (!intervals.some(([a, b]) => c > a && c < b)) continue;
      const [lo, hi] = band(m);
      const snapped = snapPast(c, intervals, lo, hi);
      if (snapped !== null) m.labelBox.y = snapped - m.labelBox.h / 2;
    }
    return (
      members.every((i) => boxValid(laid, i, cfg)) &&
      ms.every((m) => !leaderCrosses(m, laid, cfg)) &&
      groupOrderOk(ms, cfg)
    );
  };

  // Members whose rest position sits on a shaft get a side choice (above /
  // below); enumerate combinations, cheapest total displacement first.
  const choices = ms.map((m) => {
    const target = restCenter.get(m.id)!;
    const intervals = mergeIntervals(forbiddenYIntervals(m, laid, cfg));
    const hit = intervals.find(([a, b]) => target > a && target < b);
    if (!hit) return [target];
    const [lo, hi] = band(m);
    const options: number[] = [];
    if (hit[0] >= lo) options.push(hit[0]);
    if (hit[1] <= hi) options.push(hit[1]);
    options.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
    return options.length ? options : [target];
  });
  const nCombos = choices.reduce((p, c) => p * c.length, 1);
  if (nCombos > 8) {
    return false; // too tangled for in-place resolution — use the column
  }
  const combos: number[][] = [[]];
  for (const opts of choices) {
    const next: number[][] = [];
    for (const c of combos) for (const o of opts) next.push([...c, o]);
    combos.length = 0;
    combos.push(...next);
  }
  combos.sort(
    (a, b) =>
      a.reduce((s, v, k) => s + Math.abs(v - restCenter.get(ms[k].id)!), 0) -
      b.reduce((s, v, k) => s + Math.abs(v - restCenter.get(ms[k].id)!), 0),
  );

  for (const combo of combos) {
    const targets = new Map(ms.map((m, k) => [m.id, combo[k]]));
    if (attempt(targets)) return true;
    ms.forEach((m, k) => {
      m.labelBox.y = snapshot[k];
    });
  }
  return false;
}

/** Restore near→far radius ordering inside each bearing cluster after caps. */
function remonotonize(members: LaidOut[], cfg: LayoutConfig): void {
  const floor = minVisibleRadius(cfg);
  for (const cluster of clustersByBearing(members, cfg.clusterAngleDeg)) {
    const byDistance = [...cluster].sort(
      (a, b) => a.distanceKm - b.distanceKm || (a.id < b.id ? -1 : 1),
    );
    for (let i = byDistance.length - 2; i >= 0; i--) {
      byDistance[i].radius = Math.max(
        Math.min(byDistance[i].radius, byDistance[i + 1].radius - MIN_SPOKE_SEP),
        floor,
      );
    }
  }
}

/** Pick the column side for a group: follow the mean direction; near-vertical
 * groups take the side with more horizontal room (which also opposes any slight
 * lean, keeping leaders clear of the leaning spokes). +1 = right, -1 = left. */
function columnSide(members: LaidOut[], cfg: LayoutConfig, maxW: number): 1 | -1 {
  const mean = members.reduce((s, m) => s + m.dir.x, 0) / members.length;
  if (mean > cfg.anchorDeadzone) return 1;
  if (mean < -cfg.anchorDeadzone) return -1;
  const maxTipX = Math.max(...members.map((m) => m.tip.x));
  const minTipX = Math.min(...members.map((m) => m.tip.x));
  const rightSpace = cfg.width - cfg.margin - maxW - cfg.colGap - maxTipX;
  const leftSpace = minTipX - cfg.colGap - maxW - cfg.margin;
  return rightSpace >= leftSpace ? 1 : -1;
}

/** Parameter t ∈ (0,1) along segment a1→a2 where it properly crosses b1→b2,
 * or null. Shared-endpoint touches don't count. */
function segCrossParam(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): number | null {
  const rx = a2.x - a1.x;
  const ry = a2.y - a1.y;
  const sx = b2.x - b1.x;
  const sy = b2.y - b1.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < EPS) return null;
  const t = ((b1.x - a1.x) * sy - (b1.y - a1.y) * sx) / denom;
  const u = ((b1.x - a1.x) * ry - (b1.y - a1.y) * rx) / denom;
  if (t <= EPS || t >= 1 - EPS || u <= EPS || u >= 1 - EPS) return null;
  return t;
}

type ApplyBox = (m: LaidOut, centerY: number) => void;

/**
 * Lay a set of members out as one vertical column: pack slots in tip order,
 * then repair any leader × member-spoke crossing by shortening the crossing
 * spoke to just inside the intersection and re-packing. Radii only ever
 * shrink, so the loop terminates; the result is a monotone, non-crossing
 * tip→label fan.
 */
function layoutColumn(
  ms: LaidOut[],
  cfg: LayoutConfig,
  tight: boolean,
  place: (order: LaidOut[]) => ApplyBox,
): void {
  const floor = minVisibleRadius(cfg);
  const maxRepairs = ms.length * 3;
  for (let iter = 0; ; iter++) {
    const order = slotOrder(ms);
    const apply = place(order);
    packColumn(order, cfg, tight, apply);
    if (iter >= maxRepairs) return;

    // Leader × sibling-spoke crossing? Shorten the crossing spoke to just
    // inside the intersection point so it no longer reaches across the leader.
    const center = { x: cfg.cx, y: cfg.cy };
    let repaired = false;
    outer: for (const m of order) {
      const b = m.labelBox;
      const attach = {
        x: Math.min(Math.max(m.tip.x, b.x), b.x + b.w),
        y: Math.min(Math.max(m.tip.y, b.y), b.y + b.h),
      };
      for (const other of order) {
        if (other === m || other.radius <= floor + EPS) continue;
        const t = segCrossParam(center, other.tip, m.tip, attach);
        if (t === null) continue;
        const shortened = Math.max(t * other.radius - 4, floor);
        if (shortened >= other.radius - EPS) continue;
        other.radius = shortened;
        setTip(other, cfg);
        repaired = true;
        break outer;
      }
    }
    if (!repaired) return;
  }
}

/**
 * Strategy 2: outward ordered column. Mutates member radii (shortening only),
 * tips, and label boxes. Always produces an internally-consistent, in-page,
 * non-crossing arrangement; conflicts with non-members are picked up by the
 * caller's next conflict scan (which merges them in).
 */
export function placeColumn(
  members: number[],
  laid: LaidOut[],
  cfg: LayoutConfig,
  tight = false,
): void {
  const ms = members.map((i) => laid[i]);
  // A merged group spanning both hemispheres (east AND west arrows) must not
  // share one column — leaders would drag across the whole compass. Split it
  // into a column per side instead.
  const spansBoth =
    ms.some((m) => m.dir.x > 0.25) && ms.some((m) => m.dir.x < -0.25);
  if (spansBoth) {
    const right = ms.filter((m) => m.dir.x >= 0);
    const left = ms.filter((m) => m.dir.x < 0);
    if (right.length) placeSideColumn(right, cfg, 1, tight);
    if (left.length) placeSideColumn(left, cfg, -1, tight);
    return;
  }
  const maxW = Math.max(...ms.map((m) => m.labelBox.w));
  placeSideColumn(ms, cfg, columnSide(ms, cfg, maxW), tight);
}

/** Place one set of members as a single column on the given side. */
function placeSideColumn(
  ms: LaidOut[],
  cfg: LayoutConfig,
  side: 1 | -1,
  tight: boolean,
): void {
  const floor = minVisibleRadius(cfg);
  const maxW = Math.max(...ms.map((m) => m.labelBox.w));

  if (side === 1) {
    // Right column: boxes left-aligned at xCol, text anchored "start".
    const xColMax = cfg.width - cfg.margin - maxW;
    const tipMax = xColMax - cfg.colGap;
    for (const m of ms) {
      if (m.dir.x > EPS) {
        const rMax = (tipMax - cfg.cx) / m.dir.x;
        if (m.radius > rMax) m.radius = Math.max(rMax, floor);
      }
    }
    remonotonize(ms, cfg);
    ms.forEach((m) => setTip(m, cfg));
    layoutColumn(ms, cfg, tight, () => {
      const maxTipX = Math.max(...ms.map((m) => m.tip.x));
      const xCol = Math.min(
        Math.max(maxTipX, cfg.cx + cfg.homeRadius) + cfg.colGap,
        xColMax,
      );
      return (m, y) => {
        m.labelBox.x = xCol;
        m.labelBox.y = y - m.labelBox.h / 2;
        m.labelBox.anchor = "start";
      };
    });
  } else {
    // Left column: boxes right-aligned at xEdge, text anchored "end".
    const xEdgeMin = cfg.margin + maxW;
    const tipMin = xEdgeMin + cfg.colGap;
    for (const m of ms) {
      if (m.dir.x < -EPS) {
        const rMax = (cfg.cx - tipMin) / -m.dir.x;
        if (m.radius > rMax) m.radius = Math.max(rMax, floor);
      }
    }
    remonotonize(ms, cfg);
    ms.forEach((m) => setTip(m, cfg));
    layoutColumn(ms, cfg, tight, () => {
      const minTipX = Math.min(...ms.map((m) => m.tip.x));
      const xEdge = Math.max(
        Math.min(minTipX, cfg.cx - cfg.homeRadius) - cfg.colGap,
        xEdgeMin,
      );
      return (m, y) => {
        m.labelBox.x = xEdge - m.labelBox.w;
        m.labelBox.y = y - m.labelBox.h / 2;
        m.labelBox.anchor = "end";
      };
    });
  }
}

/** Vertical pack in the given top→bottom order; retries with a tight gap if the
 * stack overflows the safe band. */
function packColumn(
  order: LaidOut[],
  cfg: LayoutConfig,
  tight: boolean,
  apply: ApplyBox,
): void {
  const targets = order.map((m) => m.tip.y);
  const heights = order.map((m) => m.labelBox.h);
  const tightPad = cfg.boxPadding + 2;
  const pad = tight ? tightPad : stackGap(cfg);
  let gaps = order.slice(0, -1).map((_, k) => (heights[k] + heights[k + 1]) / 2 + pad);
  let ys = packStackVertical(targets, gaps, heights, cfg.margin, cfg.safeBottom);
  const overflows = ys[ys.length - 1] + heights[heights.length - 1] / 2 > cfg.safeBottom + 1e-6;
  if (overflows && !tight) {
    gaps = order.slice(0, -1).map((_, k) => (heights[k] + heights[k + 1]) / 2 + tightPad);
    ys = packStackVertical(targets, gaps, heights, cfg.margin, cfg.safeBottom);
  }
  order.forEach((m, k) => apply(m, ys[k]));
}

/**
 * Provable last resort for genuinely over-dense posters (the fixpoint couldn't
 * clear everything): every label goes into one of two flush margin columns by
 * its arrow's side, and every arrow is shortened to the inner region between
 * them. Deterministic and feasible whenever each side's labels fit its column
 * height (beyond that, the pack top-aligns and clips at the band — the least-bad
 * outcome for a poster with more labels than page).
 */
export function lastResortColumns(laid: LaidOut[], cfg: LayoutConfig): void {
  const floor = minVisibleRadius(cfg);
  const right = laid.filter((l) => l.dir.x >= 0);
  const left = laid.filter((l) => l.dir.x < 0);

  if (right.length) {
    const maxW = Math.max(...right.map((m) => m.labelBox.w));
    const xCol = cfg.width - cfg.margin - maxW;
    for (const m of right) {
      if (m.dir.x > EPS) {
        const rMax = (xCol - cfg.colGap - cfg.cx) / m.dir.x;
        m.radius = Math.max(Math.min(m.radius, rMax), floor);
      }
      setTip(m, cfg);
    }
    remonotonize(right, cfg);
    right.forEach((m) => setTip(m, cfg));
    layoutColumn(right, cfg, true, () => (m, y) => {
      m.labelBox.x = xCol;
      m.labelBox.y = y - m.labelBox.h / 2;
      m.labelBox.anchor = "start";
    });
  }
  if (left.length) {
    const maxW = Math.max(...left.map((m) => m.labelBox.w));
    const xEdge = cfg.margin + maxW;
    for (const m of left) {
      const rMax = (cfg.cx - xEdge - cfg.colGap) / -m.dir.x;
      m.radius = Math.max(Math.min(m.radius, rMax), floor);
      setTip(m, cfg);
    }
    remonotonize(left, cfg);
    left.forEach((m) => setTip(m, cfg));
    layoutColumn(left, cfg, true, () => (m, y) => {
      m.labelBox.x = xEdge - m.labelBox.w;
      m.labelBox.y = y - m.labelBox.h / 2;
      m.labelBox.anchor = "end";
    });
  }
}

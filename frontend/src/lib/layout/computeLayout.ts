import type { Computed } from "../types";
import { bearingToVec } from "../geo/projection";
import { rectsOverlap, segIntersectsRect } from "./aabb";
import { distanceRadius } from "./magnitude";

/**
 * Two spokes whose directions are at least this aligned (|dir·dir| ≥ cos≈16°) are
 * "near-collinear": growing a label's radius just slides it along the shared line,
 * so it can only be cleared by a perpendicular nudge. Set a touch wider than the
 * bearing-cluster threshold so a whole same-direction fan resolves by nudging.
 */
const NEAR_COLLINEAR_COS = 0.96;
import type {
  LabelBox,
  LabelSize,
  LaidOut,
  LayoutConfig,
  MeasureFn,
  TextAnchor,
} from "./types";

/** Smallest absolute angular gap between two bearings, accounting for 0/360 wrap. */
function angularGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Position a label at its arrow tip (plus a small gap and any perpendicular
 * nudge). Text extends *away* from the center: right-anchored on the left side,
 * left-anchored on the right side, centered near vertical.
 */
function placeLabel(l: LaidOut, cfg: LayoutConfig, size: LabelSize): void {
  l.tip = {
    x: cfg.cx + l.dir.x * l.radius,
    y: cfg.cy + l.dir.y * l.radius,
  };
  const perp = { x: -l.dir.y, y: l.dir.x };
  const anchorX = l.tip.x + l.dir.x * cfg.labelGap + perp.x * l.perp;
  const anchorY = l.tip.y + l.dir.y * cfg.labelGap + perp.y * l.perp;

  const anchor: TextAnchor =
    l.dir.x > 0.15 ? "start" : l.dir.x < -0.15 ? "end" : "middle";

  const { w, h } = size;
  const rawX = anchor === "start" ? anchorX : anchor === "end" ? anchorX - w : anchorX - w / 2;
  const rawY = anchorY - h / 2;

  // Keep the whole label box inside the poster margins so long place names
  // (e.g. "Los Angeles") never run off the page edge. `maxRadius` only bounds
  // the arrow *tip*; the label text overhangs it by `labelGap + textWidth`, so
  // a horizontal label near an edge can still spill over without this clamp.
  // Collisions separate along the perpendicular (the relaxation step), so
  // pinning a box to the margin doesn't block overlap resolution.
  const x = clamp(rawX, cfg.margin, cfg.width - cfg.margin - w);
  const y = clamp(rawY, cfg.margin, cfg.height - cfg.margin - h);

  // Slide the leader-line attach point by the same amount so leaders still meet
  // the (possibly clamped) label box.
  l.labelBox = {
    x,
    y,
    w,
    h,
    anchor,
    anchorX: anchorX + (x - rawX),
    anchorY: anchorY + (y - rawY),
  };
}

/** Clamp `v` into [min, max]; if the range is inverted (box wider/taller than
 * the safe area) fall back to the lower bound so the label hugs the margin. */
function clamp(v: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

function labelCenter(l: LaidOut): { x: number; y: number } {
  return { x: l.labelBox.x + l.labelBox.w / 2, y: l.labelBox.y + l.labelBox.h / 2 };
}

/**
 * Nudge a label one fixed `perpStep` along its perpendicular, locking the sign on
 * first use so movement is monotonic and the relaxation can't oscillate. The first
 * call always passes the *away-from-obstacle* direction, so the locked sign is
 * correct — two labels nudged apart can never end up sliding together, and the nudge
 * is free to grow until they clear (a clamp here would stall an unresolved overlap).
 */
function nudgePerp(l: LaidOut, desiredSign: number, cfg: LayoutConfig): void {
  const sign = l.perp !== 0 ? (l.perp > 0 ? 1 : -1) : desiredSign >= 0 ? 1 : -1;
  l.perp += sign * cfg.perpStep;
  l.needsLeader = true;
}

/**
 * Place arrows at their true bearings and resolve label collisions.
 *
 * The bearing angle is sacred. To avoid overlaps we only adjust each arrow's
 * length (radius) and, as a last resort once it hits `maxRadius`, apply a
 * perpendicular nudge + leader line. Same-direction places stack along one spoke.
 */
export function computeLayout(
  items: Computed[],
  cfg: LayoutConfig,
  measure: MeasureFn,
): LaidOut[] {
  // Seed each arrow's length. With distance scaling on, length encodes distance
  // (farther = longer) via a log-normalized map across this poster's range. A
  // single place or an all-equal-distance set has no range to scale across, so
  // it falls back to the fixed `baseRadius` (the uniform, unscaled look).
  const distances = items.map((p) => p.distanceKm);
  const dMin = Math.min(...distances);
  const dMax = Math.max(...distances);
  const useMagnitude = cfg.scaleByDistance && dMax > dMin;
  const baseRadiusFor = (p: Computed): number =>
    useMagnitude
      ? distanceRadius(p.distanceKm, dMin, dMax, cfg.minRadius, cfg.maxRadius)
      : cfg.baseRadius;

  const sizes = new Map<string, LabelSize>();
  const laid: LaidOut[] = items.map((p) => {
    sizes.set(p.id, measure(p));
    return {
      ...p,
      dir: bearingToVec(p.bearingDeg),
      radius: baseRadiusFor(p),
      perp: 0,
      tip: { x: 0, y: 0 },
      labelBox: {} as LabelBox,
      needsLeader: false,
    };
  });

  // STEP 1 — stagger near-identical bearings so same-direction arrows don't
  // overlap. Cluster by bearing; within a cluster, order by distance (nearest
  // shortest) and walk outward, forcing each arrow at least `radiusStep` past the
  // previous one. This keeps each arrow's seeded length (so distance scaling shows
  // through) while still guaranteeing separation for near-equidistant places.
  // When scaling is off every arrow seeds at `baseRadius`, so this reproduces the
  // original `baseRadius + k * radiusStep` stagger exactly.
  const byBearing = [...laid].sort((a, b) => a.bearingDeg - b.bearingDeg);
  let clusterStart = 0;
  for (let i = 1; i <= byBearing.length; i++) {
    const breaks =
      i === byBearing.length ||
      angularGap(byBearing[i - 1].bearingDeg, byBearing[i].bearingDeg) >
        cfg.clusterAngleDeg;
    if (breaks) {
      const group = byBearing
        .slice(clusterStart, i)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      let prev = -Infinity;
      for (const g of group) {
        g.radius = Math.min(Math.max(g.radius, prev + cfg.radiusStep), cfg.maxRadius);
        prev = g.radius;
      }
      clusterStart = i;
    }
  }

  // STEP 2 — place each label box.
  laid.forEach((l) => placeLabel(l, cfg, sizes.get(l.id)!));

  // STEP 3 — resolve overlaps. The bearing is sacred; only a label's length (radius)
  // and a perpendicular nudge (which draws a leader line) ever move. Two obstacle
  // classes per pass: (a) label box vs label box, (b) label box vs another arrow's
  // *line* (center → tip — the line is sacred, so only the label yields there).
  //
  // Two passes. Pass 1 is *symmetric*: when two cities overlap it moves BOTH (grow
  // both diverging spokes, or nudge both apart) so neither flies off alone — "split
  // the difference". That is best-effort: moving both breaks the radius ordering the
  // convergence proof leans on, so a crowded poster can fail to settle. So if any
  // overlap remains, we reset to the seeded layout and run the proven *asymmetric*
  // resolver (only the shorter-radius label yields), which always reaches zero.
  // Sparse posters — the common case — settle symmetrically in pass 1 and never touch
  // the fallback; only dense tangles trade some symmetry for the hard guarantee.
  const center = { x: cfg.cx, y: cfg.cy };
  const collinear = (a: LaidOut, b: LaidOut): boolean =>
    Math.abs(a.dir.x * b.dir.x + a.dir.y * b.dir.y) > NEAR_COLLINEAR_COS;
  const place = (l: LaidOut): void => placeLabel(l, cfg, sizes.get(l.id)!);
  /** Lengthen an arrow one step (no leader). Returns false if already maxed out. */
  const grow = (l: LaidOut): boolean => {
    if (l.radius >= cfg.maxRadius) return false;
    l.radius = Math.min(l.radius + cfg.pushStep, cfg.maxRadius);
    place(l);
    return true;
  };
  /** Nudge one label along its perpendicular, away from another. */
  const nudgeFrom = (t: LaidOut, other: LaidOut): void => {
    const tc = labelCenter(t);
    const oc = labelCenter(other);
    nudgePerp(t, (tc.x - oc.x) * -t.dir.y + (tc.y - oc.y) * t.dir.x, cfg);
    place(t);
  };
  /** Split two labels apart along their own perpendiculars — opposite signs, so even
   * a shared spoke separates, with the work (and the leader lengths) shared. */
  const nudgeApart = (a: LaidOut, b: LaidOut): void => {
    const ac = labelCenter(a);
    const bc = labelCenter(b);
    let s = (ac.x - bc.x) * -a.dir.y + (ac.y - bc.y) * a.dir.x;
    if (Math.abs(s) < 1e-6) s = 1; // centres coincide along the spoke: pick a side
    nudgePerp(a, s, cfg);
    nudgePerp(b, -s, cfg);
    place(a);
    place(b);
  };
  /** Push label t off arrow o's sacred line. The line never moves, so this is always
   * one-sided: grow t clear when the spokes diverge, else nudge it to its own side. */
  const clearLine = (t: LaidOut, o: LaidOut): void => {
    if (collinear(t, o) || !grow(t)) {
      const n = { x: -o.dir.y, y: o.dir.x }; // normal to o's spoke
      const tc = labelCenter(t);
      const side = (tc.x - center.x) * n.x + (tc.y - center.y) * n.y;
      const along = -t.dir.y * n.x + t.dir.x * n.y; // t's perp axis · n
      nudgePerp(t, (side >= 0 ? 1 : -1) * (along >= 0 ? 1 : -1), cfg);
      place(t);
    }
  };

  const relax = (symmetric: boolean): void => {
    for (let iter = 0; iter < cfg.maxIters; iter++) {
      let moved = false;

      // (a) label vs label
      for (let i = 0; i < laid.length; i++) {
        for (let j = i + 1; j < laid.length; j++) {
          const a = laid[i];
          const b = laid[j];
          if (!rectsOverlap(a.labelBox, b.labelBox, cfg.boxPadding)) continue;
          if (symmetric) {
            // Move both: stack the farther one on a shared spoke, else grow both
            // diverging spokes; once everything is maxed, split sideways.
            if (collinear(a, b)) {
              if (!grow(a.radius >= b.radius ? a : b)) nudgeApart(a, b);
            } else {
              const grewA = grow(a);
              const grewB = grow(b);
              if (!grewA && !grewB) nudgeApart(a, b);
            }
          } else {
            // Proven resolver: only the shorter-radius label yields.
            const shorter = a.radius <= b.radius ? a : b;
            if (!grow(shorter)) nudgeFrom(shorter, shorter === a ? b : a);
          }
          moved = true;
        }
      }

      // (b) label vs line — including the label's OWN line. A label sits a `labelGap`
      // beyond its own tip normally, but the margin clamp can drag a far corner label
      // back over its own tip; the own line is tested at pad 0 (a literal overlap, the
      // arrow ending under its own text) so clean near-vertical labels — whose box
      // grazes within `boxPadding` of their tip — don't pick up a needless leader.
      for (let i = 0; i < laid.length; i++) {
        for (let j = 0; j < laid.length; j++) {
          const pad = i === j ? 0 : cfg.boxPadding;
          if (!segIntersectsRect(center, laid[j].tip, laid[i].labelBox, pad)) continue;
          clearLine(laid[i], laid[j]);
          moved = true;
        }
      }

      if (!moved) break;
    }
  };

  const overlapsRemain = (): boolean => {
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        if (rectsOverlap(laid[i].labelBox, laid[j].labelBox, cfg.boxPadding)) return true;
      }
      for (let j = 0; j < laid.length; j++) {
        const pad = j === i ? 0 : cfg.boxPadding; // own line: literal overlap only
        if (segIntersectsRect(center, laid[j].tip, laid[i].labelBox, pad)) return true;
      }
    }
    return false;
  };

  const seedRadius = laid.map((l) => l.radius);
  relax(true); // symmetric "split the difference" — best effort
  if (overlapsRemain()) {
    // Pass 1 left a crowded poster unsettled — restart from the seed and let the
    // proven asymmetric resolver guarantee zero overlap.
    laid.forEach((l, k) => {
      l.radius = seedRadius[k];
      l.perp = 0;
      l.needsLeader = false;
      place(l);
    });
    relax(false);
  }

  return laid;
}

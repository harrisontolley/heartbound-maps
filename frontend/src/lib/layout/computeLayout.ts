import type { Computed } from "../types";
import { bearingToVec } from "../geo/projection";
import { rectsOverlap } from "./aabb";
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
  const x = anchor === "start" ? anchorX : anchor === "end" ? anchorX - w : anchorX - w / 2;
  const y = anchorY - h / 2;

  l.labelBox = { x, y, w, h, anchor, anchorX, anchorY };
}

function labelCenter(l: LaidOut): { x: number; y: number } {
  return {
    x: l.labelBox.x + l.labelBox.w / 2,
    y: l.labelBox.y + l.labelBox.h / 2,
  };
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
  const sizes = new Map<string, LabelSize>();
  const laid: LaidOut[] = items.map((p) => {
    sizes.set(p.id, measure(p));
    return {
      ...p,
      dir: bearingToVec(p.bearingDeg),
      radius: cfg.baseRadius,
      perp: 0,
      tip: { x: 0, y: 0 },
      labelBox: {} as LabelBox,
      needsLeader: false,
    };
  });

  // STEP 1 — stagger near-identical bearings so same-direction arrows don't
  // overlap. Cluster by bearing; within a cluster, order by distance and assign
  // increasing radii (nearest place gets the shortest arrow).
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
      group.forEach((g, k) => {
        g.radius = Math.min(cfg.baseRadius + k * cfg.radiusStep, cfg.maxRadius);
      });
      clusterStart = i;
    }
  }

  // STEP 2 — place each label box.
  laid.forEach((l) => placeLabel(l, cfg, sizes.get(l.id)!));

  // STEP 3 — iterative relaxation. While two label boxes overlap, push the one
  // with the smaller radius outward along its own bearing (angle stays exact).
  // Once it reaches maxRadius, nudge it perpendicular (away from the other) and
  // flag a leader line. Perp direction locks once chosen to guarantee convergence.
  for (let iter = 0; iter < cfg.maxIters; iter++) {
    let moved = false;
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        if (!rectsOverlap(laid[i].labelBox, laid[j].labelBox, cfg.boxPadding))
          continue;
        const t = laid[i].radius <= laid[j].radius ? laid[i] : laid[j];
        const other = t === laid[i] ? laid[j] : laid[i];

        if (t.radius < cfg.maxRadius) {
          t.radius = Math.min(t.radius + cfg.pushStep, cfg.maxRadius);
        } else {
          const perp = { x: -t.dir.y, y: t.dir.x };
          let sign: number;
          if (t.perp !== 0) {
            sign = t.perp > 0 ? 1 : -1;
          } else {
            const tc = labelCenter(t);
            const oc = labelCenter(other);
            const away = (tc.x - oc.x) * perp.x + (tc.y - oc.y) * perp.y;
            sign = away >= 0 ? 1 : -1;
          }
          t.perp += sign * cfg.perpStep;
          t.needsLeader = true;
        }
        placeLabel(t, cfg, sizes.get(t.id)!);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return laid;
}

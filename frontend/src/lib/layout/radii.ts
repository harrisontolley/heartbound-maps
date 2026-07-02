import type { Vec2 } from "../geo/projection";
import { distanceRadius } from "./magnitude";
import { fitRadius } from "./rest";
import type { LabelSize, LayoutConfig } from "./types";

/** Smallest absolute angular gap between two bearings, accounting for 0/360 wrap. */
export function angularGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Group items into same-direction clusters: sort by bearing and break the chain
 * wherever the gap to the next bearing exceeds `clusterAngleDeg`. (The 0/360 seam
 * is treated as a break — acceptable: a due-north pair lands in adjacent clusters
 * and any label conflict between them is still resolved by the conflict graph.)
 */
export function clustersByBearing<T extends { bearingDeg: number; id: string }>(
  items: T[],
  clusterAngleDeg: number,
): T[][] {
  const byBearing = [...items].sort(
    (a, b) => a.bearingDeg - b.bearingDeg || (a.id < b.id ? -1 : 1),
  );
  const groups: T[][] = [];
  let start = 0;
  for (let i = 1; i <= byBearing.length; i++) {
    const breaks =
      i === byBearing.length ||
      angularGap(byBearing[i - 1].bearingDeg, byBearing[i].bearingDeg) > clusterAngleDeg;
    if (breaks) {
      groups.push(byBearing.slice(start, i));
      start = i;
    }
  }
  return groups;
}

/** Arrows never get shorter than this — they must visibly leave the home marker
 * even when a very wide label caps the fit radius hard. */
export function minVisibleRadius(cfg: LayoutConfig): number {
  return cfg.homeRadius + 24;
}

/** Minimum along-spoke tip separation kept inside a cluster when the full
 * `radiusStep` can't fit under the caps (order still reads near → far). */
const MIN_SPOKE_SEP = 24;

export type RadiusSeed = { radius: number; fitCap: number };

export type RadiusItem = {
  id: string;
  bearingDeg: number;
  distanceKm: number;
  dir: Vec2;
  size: LabelSize;
};

/**
 * Seed every arrow's length, then stagger same-direction clusters.
 *
 * Seeding: distance-scaled (proportional log map — see `magnitude.ts`) but
 * capped at `fitRadius` so the rest-position label always fits the safe rect
 * ("shorten the arrow, never clamp the label"), floored so the arrow stays
 * visible.
 *
 * Stagger: within each bearing cluster, walk outward by distance forcing
 * `radiusStep` separation (so same-spoke tips don't collide), respecting each
 * member's fit cap; a backward pass then restores strict near→far ordering
 * (at ≥ MIN_SPOKE_SEP) wherever a cap forced an inversion.
 */
export function seedRadii(items: RadiusItem[], cfg: LayoutConfig): Map<string, RadiusSeed> {
  const floor = minVisibleRadius(cfg);
  const distances = items.map((p) => p.distanceKm);
  const dMin = Math.min(...distances);
  const dMax = Math.max(...distances);
  const useMagnitude = cfg.scaleByDistance && dMax > dMin;

  const seeds = new Map<string, RadiusSeed>();
  for (const p of items) {
    const base = useMagnitude
      ? distanceRadius(p.distanceKm, dMin, dMax, cfg.minRadius, cfg.maxRadius, cfg.ratioFull)
      : cfg.baseRadius;
    const cap = fitRadius(p.dir, p.size, cfg);
    let r = Math.min(base, cfg.maxRadius, cap);
    r = Math.max(r, cfg.minRadius);
    // The distance floor must never push the label back out of the safe rect.
    if (r > cap) r = Math.max(cap, floor);
    seeds.set(p.id, { radius: r, fitCap: cap });
  }

  for (const cluster of clustersByBearing(items, cfg.clusterAngleDeg)) {
    if (cluster.length < 2) continue;
    const byDistance = [...cluster].sort(
      (a, b) => a.distanceKm - b.distanceKm || (a.id < b.id ? -1 : 1),
    );
    // Forward: force each arrow at least `radiusStep` past the previous one,
    // under its own ceiling.
    let prev = -Infinity;
    for (const m of byDistance) {
      const s = seeds.get(m.id)!;
      const ceil = Math.max(Math.min(cfg.maxRadius, s.fitCap), floor);
      s.radius = Math.min(Math.max(s.radius, prev + cfg.radiusStep), ceil);
      prev = s.radius;
    }
    // Backward: where a ceiling forced an inversion, pull nearer members in so
    // the cluster still reads near → far along the spoke.
    for (let i = byDistance.length - 2; i >= 0; i--) {
      const s = seeds.get(byDistance[i].id)!;
      const next = seeds.get(byDistance[i + 1].id)!;
      s.radius = Math.max(Math.min(s.radius, next.radius - MIN_SPOKE_SEP), floor);
    }
  }

  return seeds;
}

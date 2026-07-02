/**
 * Map a place's distance to an arrow length, so farther places get longer arrows.
 *
 * Two competing needs:
 *  - Real-world distance sets are heavily skewed (a neighbouring town at 40km
 *    next to an overseas city at 17,000km), so a linear map would crush every
 *    nearer place into a stub → distances spread on a log curve.
 *  - Near-equal distance sets (Jakarta → Brisbane/Melbourne/Sydney, all ~5% apart)
 *    must NOT be stretched across the full [minRadius, maxRadius] range — that
 *    made a city 3% nearer look half as far. The *amount* of range used is
 *    therefore proportional to the log-ratio of the set: `dMax/dMin ≥ ratioFull`
 *    uses the full range; smaller ratios use a proportionally narrower band
 *    anchored at `maxRadius` (the farthest place always reads "far").
 *
 * The caller guarantees `dMax >= dMin >= 1` (places within 1km of home are
 * filtered upstream in `computePlaces`), so the logs are finite. `dMax === dMin`
 * returns `maxRadius` (no range to scale across).
 */
export function distanceRadius(
  distanceKm: number,
  dMin: number,
  dMax: number,
  minRadius: number,
  maxRadius: number,
  ratioFull = 8,
): number {
  if (dMax <= dMin) return maxRadius;
  // Fraction of the radius range this distance-set gets to use.
  const spread = Math.min(1, Math.log(dMax / dMin) / Math.log(ratioFull));
  const usedRange = spread * (maxRadius - minRadius);
  const lowEnd = maxRadius - usedRange;
  const t = (Math.log(distanceKm) - Math.log(dMin)) / (Math.log(dMax) - Math.log(dMin));
  const c = Math.min(1, Math.max(0, t));
  return lowEnd + c * usedRange;
}

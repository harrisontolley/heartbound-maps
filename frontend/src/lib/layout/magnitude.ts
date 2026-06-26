/**
 * Map a place's distance to an arrow length, so farther places get longer arrows.
 *
 * Real-world distance sets are heavily skewed (a neighbouring town at 40km next
 * to an overseas city at 17,000km), so a linear map would crush every nearer
 * place into a stub. We log-normalize instead: the nearest place lands on
 * `minRadius`, the farthest on `maxRadius`, and everything in between spreads on
 * a compressed (log) curve that keeps both ends visibly distinct.
 *
 * The caller guarantees `dMax > dMin` and `distanceKm >= 1` (places within 1km of
 * home are filtered upstream in `computePlaces`), so the logs are finite and the
 * denominator is non-zero.
 */
export function distanceRadius(
  distanceKm: number,
  dMin: number,
  dMax: number,
  minRadius: number,
  maxRadius: number,
): number {
  const t =
    (Math.log(distanceKm) - Math.log(dMin)) /
    (Math.log(dMax) - Math.log(dMin));
  const c = Math.min(1, Math.max(0, t));
  return minRadius + c * (maxRadius - minRadius);
}

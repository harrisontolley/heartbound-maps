import type { BearingMode, Computed, LatLng, Place } from "../types";
import { haversineKm } from "./haversine";
import { initialBearingDeg } from "./bearing";
import { rhumbBearingDeg, rhumbDistanceKm } from "./rhumb";

/**
 * Enrich each place with its distance + bearing from home. The bearing mode
 * selects matching distance + direction: "great-circle" uses the true initial
 * azimuth + haversine; "rhumb" uses the constant-heading loxodrome (both larger,
 * but matching a flat map). Places that coincide with home (within `minKm`,
 * measured great-circle) have no meaningful bearing and are skipped.
 */
export function computePlaces(
  home: LatLng,
  places: Place[],
  opts: { mode?: BearingMode; minKm?: number } = {},
): Computed[] {
  const { mode = "great-circle", minKm = 1 } = opts;
  const out: Computed[] = [];
  for (const p of places) {
    if (haversineKm(home, p) < minKm) continue;
    const distanceKm =
      mode === "rhumb" ? rhumbDistanceKm(home, p) : haversineKm(home, p);
    const bearingDeg =
      mode === "rhumb" ? rhumbBearingDeg(home, p) : initialBearingDeg(home, p);
    out.push({ ...p, distanceKm, bearingDeg });
  }
  return out;
}

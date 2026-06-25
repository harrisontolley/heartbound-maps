import type { LatLng } from "../types";
import { R_EARTH_KM, toDeg, toRad } from "./angle";

// Rhumb line (loxodrome): a path of constant compass heading. It plots as a
// straight line on a Mercator map, which is why it matches map intuition — but
// it is longer than the great circle and is not a single "true" bearing on a
// sphere. Formulas adapted from Ed Williams' Aviation Formulary / movable-type.

/** Shrink a longitude delta (radians) to the shorter E/W direction, (-π, π]. */
function shortLngDelta(dLng: number): number {
  if (dLng > Math.PI) return dLng - 2 * Math.PI;
  if (dLng < -Math.PI) return dLng + 2 * Math.PI;
  return dLng;
}

/** Mercator stretched-latitude difference between two points. */
function deltaPsi(lat1: number, lat2: number): number {
  return Math.log(
    Math.tan(Math.PI / 4 + lat2 / 2) / Math.tan(Math.PI / 4 + lat1 / 2),
  );
}

/** Rhumb-line (constant-heading) bearing, degrees clockwise from North, [0, 360). */
export function rhumbBearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = shortLngDelta(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(dLng, deltaPsi(lat1, lat2))) + 360) % 360;
}

/** Rhumb-line (constant-heading) distance, in km. Always ≥ the great-circle distance. */
export function rhumbDistanceKm(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLng = shortLngDelta(toRad(b.lng - a.lng));
  const dPsi = deltaPsi(lat1, lat2);
  // q → cos(lat1) for near-east-west lines where dPsi ≈ 0 (avoid divide-by-zero).
  const q = Math.abs(dPsi) > 1e-12 ? dLat / dPsi : Math.cos(lat1);
  return Math.sqrt(dLat * dLat + q * q * dLng * dLng) * R_EARTH_KM;
}

import type { AccountUnits } from "./account.js";

// Pure geometry primitives — a backend-facing re-port of the already-proven,
// unit-tested functions in frontend/src/lib/geo/{haversine,bearing,rhumb,
// compass,format}.ts (that module can't be imported directly: it's frontend-
// only and pulls in frontend/src/lib/types). This file has zero runtime deps
// (only a type-only import of the sibling AccountUnits alias) so the backend
// can compute the same distances/bearings/compass points the studio draws,
// without depending on the frontend app. Today's only consumer is
// backend/src/emails/coordinateStory.ts (see geo.test.ts for ported cases).

export type GeoPoint = { lat: number; lng: number };

/** How a place's direction + distance from home are computed — mirrors the
 * studio's BearingMode (frontend/src/lib/types.ts). */
export type BearingMode = "great-circle" | "rhumb";

const R_EARTH_KM = 6371;
const toRad = (d: number): number => (d * Math.PI) / 180;
const toDeg = (r: number): number => (r * 180) / Math.PI;

/** Great-circle distance (Haversine), in km. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h));
}

/** True initial bearing (forward azimuth), degrees clockwise from North, [0, 360). */
export function initialBearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Rhumb line (loxodrome): a path of constant compass heading. It plots as a
// straight line on a Mercator map (matching map intuition) but is longer than
// the great circle and isn't a single "true" bearing on a sphere.

/** Shrink a longitude delta (radians) to the shorter E/W direction, (-π, π]. */
function shortLngDelta(dLng: number): number {
  if (dLng > Math.PI) return dLng - 2 * Math.PI;
  if (dLng < -Math.PI) return dLng + 2 * Math.PI;
  return dLng;
}

/** Mercator stretched-latitude difference between two points. */
function deltaPsi(lat1: number, lat2: number): number {
  return Math.log(Math.tan(Math.PI / 4 + lat2 / 2) / Math.tan(Math.PI / 4 + lat1 / 2));
}

/** Rhumb-line (constant-heading) bearing, degrees clockwise from North, [0, 360). */
export function rhumbBearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = shortLngDelta(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(dLng, deltaPsi(lat1, lat2))) + 360) % 360;
}

/** Rhumb-line (constant-heading) distance, in km. Always ≥ the great-circle distance. */
export function rhumbDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLng = shortLngDelta(toRad(b.lng - a.lng));
  const dPsi = deltaPsi(lat1, lat2);
  const q = Math.abs(dPsi) > 1e-12 ? dLat / dPsi : Math.cos(lat1);
  return Math.sqrt(dLat * dLat + q * q * dLng * dLng) * R_EARTH_KM;
}

const COMPASS16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

export type Compass16 = (typeof COMPASS16)[number];

/** 16-point compass abbreviation for a bearing in degrees. */
export function compass16(bearingDeg: number): Compass16 {
  return COMPASS16[Math.round(bearingDeg / 22.5) % 16];
}

const MI_PER_KM = 0.621371;

/**
 * Format a distance for a poster label / email sentence. Distances ≥ 1000 are
 * rounded to the nearest 10 and grouped with thousands separators; smaller
 * ones round to the nearest unit. Locale pinned to en-US so output is
 * deterministic wherever it runs.
 */
export function fmtDistance(km: number, units: AccountUnits): string {
  const v = units === "mi" ? km * MI_PER_KM : km;
  const rounded = v >= 1000 ? Math.round(v / 10) * 10 : Math.round(v);
  return `${rounded.toLocaleString("en-US")} ${units}`;
}

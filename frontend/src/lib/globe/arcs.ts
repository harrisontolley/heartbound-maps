import type { Place } from "@/lib/types";
import { AFFILIATIONS } from "@/lib/affiliations/registry";
import { compass16, computePlaces, fmtDistance, type Compass16 } from "@/lib/geo";

/**
 * Maps a home + its places into the arc/point arrays react-globe.gl consumes,
 * mirroring how a Heartbound Maps poster encodes home -> places. This is pure data:
 * no three.js, no React — so it imports cheaply and is unit-testable.
 *
 * Each arc/destination also carries its EXACT measurement — true compass bearing
 * + great-circle distance from the same engine that draws the posters
 * (computePlaces) — so the globe can show the differentiation, not just suggest it.
 */

/** Color for the home marker and the start of every arc. */
export const HOME_COLOR = "#0c0a09";

/** One great-circle arc from home to a destination. */
export type GlobeArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  /** Two-stop gradient [home, destination] for react-globe.gl's arcColor. */
  color: [string, string];
  /** Tooltip text, e.g. "New York -> London". */
  label: string;
  /** True initial bearing from home, degrees clockwise from N, [0, 360). */
  bearingDeg: number;
  /** Great-circle distance from home, km. */
  distanceKm: number;
  /** 16-point compass abbreviation of the bearing, e.g. "NE". */
  compass: Compass16;
};

/** One city marker on the globe. */
export type GlobePoint = {
  lat: number;
  lng: number;
  color: string;
  /** Marker radius in globe-relative (angular) units. */
  size: number;
  label: string;
  isHome: boolean;
  /** Measurement from home — present on destinations, undefined for home. */
  bearingDeg?: number;
  distanceKm?: number;
  compass?: Compass16;
};

export type GlobeData = {
  arcs: GlobeArc[];
  points: GlobePoint[];
};

/**
 * "51° NE · 5,570 km" — the exact direction + distance, formatted with the same
 * helper the posters use (fmtDistance is locale-deterministic).
 */
export function formatReadout(m: {
  bearingDeg: number;
  compass: Compass16;
  distanceKm: number;
}): string {
  return `${Math.round(m.bearingDeg)}° ${m.compass} · ${fmtDistance(m.distanceKm, "km")}`;
}

export function buildGlobeData(home: Place, places: Place[]): GlobeData {
  // Reuse the poster engine: true initial bearing + great-circle distance.
  const computed = computePlaces(home, places);

  const arcs: GlobeArc[] = computed.map((p) => ({
    startLat: home.lat,
    startLng: home.lng,
    endLat: p.lat,
    endLng: p.lng,
    color: [HOME_COLOR, AFFILIATIONS[p.affiliation].color],
    label: `${home.label} → ${p.label}`,
    bearingDeg: p.bearingDeg,
    distanceKm: p.distanceKm,
    compass: compass16(p.bearingDeg),
  }));

  const points: GlobePoint[] = [
    {
      lat: home.lat,
      lng: home.lng,
      color: HOME_COLOR,
      size: 0.5,
      label: home.label,
      isHome: true,
    },
    ...computed.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      color: AFFILIATIONS[p.affiliation].color,
      size: 0.32,
      label: p.label,
      isHome: false,
      bearingDeg: p.bearingDeg,
      distanceKm: p.distanceKm,
      compass: compass16(p.bearingDeg),
    })),
  ];

  return { arcs, points };
}

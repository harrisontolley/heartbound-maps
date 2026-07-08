// Core domain types shared across geo, layout, templates, and UI.

export type LatLng = { lat: number; lng: number };

export type Units = "km" | "mi";

/**
 * How a place's direction + distance from home are computed.
 * - "great-circle": the true shortest path (initial forward azimuth + haversine).
 * - "rhumb": a constant-heading loxodrome — matches a straight line on a flat map.
 */
export type BearingMode = "great-circle" | "rhumb";

/** A person's tie to a place. Full categorization with per-type encoding. */
export type Affiliation =
  | "born"
  | "lived"
  | "studied"
  | "met"
  | "married"
  | "family"
  | "visited"
  | "adventure";

export type Place = {
  id: string;
  /** Short, user-editable display name, e.g. "Sydney". */
  label: string;
  /** Geocoder result for disambiguation, e.g. "Sydney, NSW, Australia". */
  fullName: string;
  lat: number;
  lng: number;
  /** Optional geocoder classification: "city" | "town" | "village" | ... */
  kind?: string;
  /** The primary tie to this place. */
  affiliation: Affiliation;
};

/** A place enriched with its geometry relative to home. */
export type Computed = Place & {
  distanceKm: number;
  /** True initial bearing from home, 0=N, 90=E, clockwise, in [0, 360). */
  bearingDeg: number;
};

/** Normalized geocoder result returned by the backend /geocode routes. */
export type { GeoResult } from "@heartbound/shared";

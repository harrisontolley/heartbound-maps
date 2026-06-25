// Shared API contract types — the single source of truth for data that crosses
// the frontend <-> backend boundary.

/** Normalized geocoder result returned by the backend /geocode routes. */
export type GeoResult = {
  id: string;
  label: string;
  fullName: string;
  lat: number;
  lng: number;
  kind?: string;
};

import type { ProjectionMode } from "../geo/worldProjection";

export type { ProjectionMode };

/** A single ordered stop on a trip. Deliberately leaner than poster `Place`. */
export interface TripStop {
  id: string;
  label: string;
  fullName: string;
  lat: number;
  lng: number;
}

export type RouteStyle = "arc" | "straight";

/** Live style toggles for the trip-map playground. */
export interface TripStyle {
  showBackdrop: boolean;
  routeStyle: RouteStyle;
  projection: ProjectionMode;
  loopHome: boolean;
}

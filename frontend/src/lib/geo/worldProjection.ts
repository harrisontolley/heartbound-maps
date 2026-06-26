import type { Vec2 } from "./projection";

export type { Vec2 };

/** "world" = full globe recentred on the route; "fit" = zoom to the route bbox. */
export type ProjectionMode = "world" | "fit";

export interface Viewport {
  width: number;
  height: number;
}

export interface GeoBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Default landscape canvas. Plate-carrée world is 2:1, so the box is too. */
export const DEFAULT_VIEW: Viewport = { width: 1400, height: 700 };

const FIT_PAD = 0.12;

/** Normalize a longitude delta into (-180, 180]. */
export function normalizeLngDelta(delta: number): number {
  const d = ((((delta + 180) % 360) + 360) % 360) - 180;
  return d === -180 ? 180 : d;
}

/**
 * Cumulatively "unwrap" an ordered longitude sequence so each consecutive leg
 * takes the short way around the globe. Tokyo (139.65) → New York (-74) becomes
 * 139.65 → 286.0 instead of streaking back across the whole map.
 */
export function unwrapLongitudes(lngs: number[]): number[] {
  if (lngs.length === 0) return [];
  const out = [lngs[0]];
  for (let i = 1; i < lngs.length; i++) {
    out.push(out[i - 1] + normalizeLngDelta(lngs[i] - lngs[i - 1]));
  }
  return out;
}

/** Shift a longitude into the 360°-wide window centred on centerLng. */
export function wrapLngInto(lng: number, centerLng: number): number {
  return centerLng + normalizeLngDelta(lng - centerLng);
}

/** Equirectangular projector (north up) for the given geo window + canvas. */
export function makeProjector(
  bounds: GeoBounds,
  view: Viewport,
): (lng: number, lat: number) => Vec2 {
  const spanLng = bounds.maxLng - bounds.minLng || 1;
  const spanLat = bounds.maxLat - bounds.minLat || 1;
  return (lng, lat) => ({
    x: ((lng - bounds.minLng) / spanLng) * view.width,
    y: ((bounds.maxLat - lat) / spanLat) * view.height,
  });
}

export interface Projection {
  view: Viewport;
  bounds: GeoBounds;
  centerLng: number;
  /** Project any geo coordinate (wraps longitude into the window) — for land. */
  project: (lng: number, lat: number) => Vec2;
  /** Projected stop markers, parallel to the input stops (unwrapped longitudes). */
  points: Vec2[];
}

/**
 * Build the equirectangular projection for a route. Both modes recentre the
 * window on the route's longitudinal midpoint (using unwrapped longitudes) so a
 * trip never crosses a canvas edge and every leg can take the short path.
 */
export function buildProjection(
  stops: GeoPoint[],
  mode: ProjectionMode,
  view: Viewport = DEFAULT_VIEW,
): Projection {
  const ratio = view.width / view.height;
  const unwrapped = unwrapLongitudes(stops.map((s) => s.lng));

  let bounds: GeoBounds;
  let centerLng: number;

  if (stops.length === 0) {
    centerLng = 0;
    bounds = { minLng: -180, maxLng: 180, minLat: -90, maxLat: 90 };
  } else {
    const minU = Math.min(...unwrapped);
    const maxU = Math.max(...unwrapped);
    centerLng = (minU + maxU) / 2;

    if (mode === "world") {
      // Full globe, recentred. halfLat keeps plate-carrée scale (== 90 at 2:1).
      const halfLat = 180 / ratio;
      bounds = {
        minLng: centerLng - 180,
        maxLng: centerLng + 180,
        minLat: -halfLat,
        maxLat: halfLat,
      };
    } else {
      const lats = stops.map((s) => s.lat);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      let spanLng = Math.max(maxU - minU, 1) * (1 + FIT_PAD * 2);
      let spanLat = Math.max(maxLat - minLat, 1) * (1 + FIT_PAD * 2);
      // Expand the short axis so degrees-per-pixel stays uniform (no stretch).
      if (spanLng / spanLat < ratio) spanLng = spanLat * ratio;
      else spanLat = spanLng / ratio;
      const cLat = (minLat + maxLat) / 2;
      bounds = {
        minLng: centerLng - spanLng / 2,
        maxLng: centerLng + spanLng / 2,
        minLat: cLat - spanLat / 2,
        maxLat: cLat + spanLat / 2,
      };
    }
  }

  const projector = makeProjector(bounds, view);
  // Stop longitudes are already unwrapped within the window — project directly.
  const points = stops.map((s, i) => projector(unwrapped[i], s.lat));
  const project = (lng: number, lat: number) =>
    projector(wrapLngInto(lng, centerLng), lat);

  return { view, bounds, centerLng, project, points };
}

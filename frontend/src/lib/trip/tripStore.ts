import { create } from "zustand";
import type { GeoResult } from "../types";
import type { ProjectionMode, RouteStyle, TripStop } from "./types";

let idCounter = 0;
function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `stop-${idCounter++}`;
}

/** True if two coordinates are within ~50m (treat as the same stop). */
function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.abs(a.lat - b.lat) < 5e-4 && Math.abs(a.lng - b.lng) < 5e-4;
}

export function geoToStop(r: GeoResult): TripStop {
  return {
    id: newId(),
    label: r.label,
    fullName: r.fullName,
    lat: r.lat,
    lng: r.lng,
  };
}

// Showcase itinerary: the round-the-world example from the brief. Fixed ids keep
// SSR and the first client render identical (no crypto in the seed).
export const TRIP_SEED: TripStop[] = [
  { id: "trip-sydney", label: "Sydney", fullName: "Sydney, NSW, Australia", lat: -33.8688, lng: 151.2093 },
  { id: "trip-singapore", label: "Singapore", fullName: "Singapore", lat: 1.3521, lng: 103.8198 },
  { id: "trip-beijing", label: "Beijing", fullName: "Beijing, China", lat: 39.9042, lng: 116.4074 },
  { id: "trip-tokyo", label: "Tokyo", fullName: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { id: "trip-nyc", label: "New York", fullName: "New York, United States", lat: 40.7128, lng: -74.006 },
];

const DEFAULT_STYLE = {
  loopHome: false,
  showBackdrop: true,
  routeStyle: "arc" as RouteStyle,
  projection: "world" as ProjectionMode,
};

interface TripState {
  stops: TripStop[];
  loopHome: boolean;
  showBackdrop: boolean;
  routeStyle: RouteStyle;
  projection: ProjectionMode;

  /** Append a geocoder result; rejects near-duplicates. */
  addStop: (r: GeoResult) => "added" | "duplicate";
  removeStop: (id: string) => void;
  moveStop: (id: string, dir: "up" | "down") => void;
  setLabel: (id: string, label: string) => void;
  setLoopHome: (v: boolean) => void;
  setShowBackdrop: (v: boolean) => void;
  setRouteStyle: (v: RouteStyle) => void;
  setProjection: (v: ProjectionMode) => void;
  clear: () => void;
  loadSeed: () => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  stops: TRIP_SEED,
  ...DEFAULT_STYLE,

  addStop: (r) => {
    const stops = get().stops;
    if (stops.some((s) => sameSpot(s, r))) return "duplicate";
    set({ stops: [...stops, geoToStop(r)] });
    return "added";
  },
  removeStop: (id) => set((s) => ({ stops: s.stops.filter((x) => x.id !== id) })),
  moveStop: (id, dir) =>
    set((s) => {
      const i = s.stops.findIndex((x) => x.id === id);
      if (i < 0) return {};
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= s.stops.length) return {};
      const next = s.stops.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return { stops: next };
    }),
  setLabel: (id, label) =>
    set((s) => ({
      stops: s.stops.map((x) => (x.id === id ? { ...x, label } : x)),
    })),
  setLoopHome: (loopHome) => set({ loopHome }),
  setShowBackdrop: (showBackdrop) => set({ showBackdrop }),
  setRouteStyle: (routeStyle) => set({ routeStyle }),
  setProjection: (projection) => set({ projection }),
  clear: () => set({ stops: [] }),
  loadSeed: () => set({ stops: TRIP_SEED }),
  reset: () => set({ stops: TRIP_SEED, ...DEFAULT_STYLE }),
}));

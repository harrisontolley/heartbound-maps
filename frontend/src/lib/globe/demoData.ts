import type { Place } from "@/lib/types";

/**
 * The landing globe's example: a Texas home with a globe-spanning set of
 * destinations (wide spread of bearings + distances so the readouts are varied
 * and recognizable). The home is replaced live by the "try it yourself" search;
 * the destinations stay fixed. Kept separate from src/lib/seed.ts so the studio's
 * default poster is unaffected.
 */

export const GLOBE_DEMO_HOME: Place = {
  id: "globe-home-austin",
  label: "Austin",
  fullName: "Austin, Texas, United States",
  lat: 30.2672,
  lng: -97.7431,
  kind: "city",
  affiliation: "lived",
};

export const GLOBE_DEMO_PLACES: Place[] = [
  {
    id: "globe-new-york",
    label: "New York",
    fullName: "New York, New York, United States",
    lat: 40.7128,
    lng: -74.006,
    kind: "city",
    affiliation: "visited",
  },
  {
    id: "globe-seattle",
    label: "Seattle",
    fullName: "Seattle, Washington, United States",
    lat: 47.6062,
    lng: -122.3321,
    kind: "city",
    affiliation: "lived",
  },
  {
    id: "globe-cape-town",
    label: "Cape Town",
    fullName: "Cape Town, South Africa",
    lat: -33.9249,
    lng: 18.4241,
    kind: "city",
    affiliation: "family",
  },
  {
    id: "globe-sydney",
    label: "Sydney",
    fullName: "Sydney, New South Wales, Australia",
    lat: -33.8688,
    lng: 151.2093,
    kind: "city",
    affiliation: "visited",
  },
  {
    id: "globe-london",
    label: "London",
    fullName: "London, England, United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    kind: "city",
    affiliation: "born",
  },
];

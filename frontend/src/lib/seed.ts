import type { Place } from "./types";

// Showcase preset so the app opens populated and sellable. Chosen to spread
// arrows around the whole compass (Tokyo ~N, Sydney ~S, LA ~NE, Cape Town ~SW,
// London ~NW) and to exercise all four tie types in the legend.

export const SEED_HOME: Place = {
  id: "seed-brisbane",
  label: "Brisbane",
  fullName: "Brisbane City, Queensland, Australia",
  lat: -27.4698,
  lng: 153.0251,
  kind: "city",
  affiliation: "lived",
};

export const SEED_PLACES: Place[] = [
  {
    id: "seed-sydney",
    label: "Sydney",
    fullName: "Sydney, New South Wales, Australia",
    lat: -33.8688,
    lng: 151.2093,
    kind: "city",
    affiliation: "born",
  },
  {
    id: "seed-tokyo",
    label: "Tokyo",
    fullName: "Tokyo, Japan",
    lat: 35.6762,
    lng: 139.6503,
    kind: "city",
    affiliation: "visited",
  },
  {
    id: "seed-la",
    label: "Los Angeles",
    fullName: "Los Angeles, California, United States",
    lat: 34.0522,
    lng: -118.2437,
    kind: "city",
    affiliation: "family",
  },
  {
    id: "seed-capetown",
    label: "Cape Town",
    fullName: "Cape Town, Western Cape, South Africa",
    lat: -33.9249,
    lng: 18.4241,
    kind: "city",
    affiliation: "lived",
  },
  {
    id: "seed-london",
    label: "London",
    fullName: "London, England, United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    kind: "city",
    affiliation: "visited",
  },
];

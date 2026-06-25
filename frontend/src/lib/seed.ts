import type { Place } from "./types";

// Showcase preset so the app opens populated and sellable. Home is New York (the
// US-focused default); destinations spread arrows around the whole compass
// (London ~NE, Miami ~S, Chicago/LA ~W, Seattle ~NW) and exercise all four tie
// types in the legend.

export const SEED_HOME: Place = {
  id: "seed-nyc",
  label: "New York",
  fullName: "New York, New York, United States",
  lat: 40.7128,
  lng: -74.006,
  kind: "city",
  affiliation: "lived",
};

export const SEED_PLACES: Place[] = [
  {
    id: "seed-chicago",
    label: "Chicago",
    fullName: "Chicago, Illinois, United States",
    lat: 41.8781,
    lng: -87.6298,
    kind: "city",
    affiliation: "born",
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
    id: "seed-miami",
    label: "Miami",
    fullName: "Miami, Florida, United States",
    lat: 25.7617,
    lng: -80.1918,
    kind: "city",
    affiliation: "visited",
  },
  {
    id: "seed-seattle",
    label: "Seattle",
    fullName: "Seattle, Washington, United States",
    lat: 47.6062,
    lng: -122.3321,
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

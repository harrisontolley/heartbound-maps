// A small, shared place set used only to render the look thumbnails. Every
// thumbnail draws the SAME map (NYC home + four destinations spread around the
// compass, one per affiliation), so the cards differ purely by style — which is
// the point of the picker. Decoupled from the user's real poster on purpose.

import type { Place } from "../types";

/** Portrait poster units; thumbnails scale down via CSS (aspect-[2/3]). */
export const THUMB_W = 1000;
export const THUMB_H = 1500;

export const THUMB_HOME: Place = {
  id: "thumb-home",
  label: "New York",
  fullName: "New York, New York, United States",
  lat: 40.7128,
  lng: -74.006,
  kind: "city",
  affiliation: "lived",
};

export const THUMB_PLACES: Place[] = [
  {
    id: "thumb-london",
    label: "London",
    fullName: "London, England, United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    kind: "city",
    affiliation: "visited", // ~NE
  },
  {
    id: "thumb-miami",
    label: "Miami",
    fullName: "Miami, Florida, United States",
    lat: 25.7617,
    lng: -80.1918,
    kind: "city",
    affiliation: "family", // ~S
  },
  {
    id: "thumb-chicago",
    label: "Chicago",
    fullName: "Chicago, Illinois, United States",
    lat: 41.8781,
    lng: -87.6298,
    kind: "city",
    affiliation: "born", // ~W
  },
  {
    id: "thumb-seattle",
    label: "Seattle",
    fullName: "Seattle, Washington, United States",
    lat: 47.6062,
    lng: -122.3321,
    kind: "city",
    affiliation: "lived", // ~NW
  },
];

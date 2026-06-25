import { describe, it, expect } from "vitest";
import { rhumbBearingDeg, rhumbDistanceKm } from "./rhumb";
import { initialBearingDeg } from "./bearing";
import { haversineKm } from "./haversine";
import { computePlaces } from "./places";
import type { Place } from "../types";

const BRISBANE = { lat: -27.4698, lng: 153.0251 };
const CAPE_TOWN = { lat: -33.9249, lng: 18.4241 };

describe("rhumbBearingDeg", () => {
  it("points nearly due west for Brisbane → Cape Town (the map intuition)", () => {
    // Rhumb ≈ 267° (WbS); the great circle is ≈ 218° (SW). This ~49° gap is the
    // whole reason for the toggle.
    expect(rhumbBearingDeg(BRISBANE, CAPE_TOWN)).toBeCloseTo(266.8, 0);
    expect(initialBearingDeg(BRISBANE, CAPE_TOWN)).toBeCloseTo(217.7, 0);
  });

  it("is due east / north for axis-aligned moves", () => {
    expect(rhumbBearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(90, 5);
    expect(rhumbBearingDeg({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(0, 5);
  });

  it("takes the short way across the antimeridian", () => {
    // 170°E → -170°E is a 20° hop east, not 340° west.
    expect(rhumbBearingDeg({ lat: 0, lng: 170 }, { lat: 0, lng: -170 })).toBeCloseTo(90, 5);
  });
});

describe("rhumbDistanceKm", () => {
  it("is longer than the great-circle distance", () => {
    const rhumb = rhumbDistanceKm(BRISBANE, CAPE_TOWN);
    const gc = haversineKm(BRISBANE, CAPE_TOWN);
    expect(rhumb).toBeGreaterThan(gc);
    expect(rhumb).toBeCloseTo(12871, -2); // ~12,900 km
  });

  it("matches haversine for a due-east equatorial line (q → cos lat branch)", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 10 };
    expect(rhumbDistanceKm(a, b)).toBeCloseTo(haversineKm(a, b), 3);
  });
});

describe("computePlaces honors the bearing mode", () => {
  const ct: Place = {
    id: "ct",
    label: "Cape Town",
    fullName: "",
    lat: CAPE_TOWN.lat,
    lng: CAPE_TOWN.lng,
    affiliation: "visited",
  };

  it("defaults to great-circle", () => {
    const [c] = computePlaces(BRISBANE, [ct]);
    expect(c.bearingDeg).toBeCloseTo(217.7, 0);
  });

  it("uses rhumb bearing + distance when asked", () => {
    const [gc] = computePlaces(BRISBANE, [ct]);
    const [rh] = computePlaces(BRISBANE, [ct], { mode: "rhumb" });
    expect(rh.bearingDeg).toBeCloseTo(266.8, 0);
    expect(rh.distanceKm).toBeGreaterThan(gc.distanceKm);
  });
});

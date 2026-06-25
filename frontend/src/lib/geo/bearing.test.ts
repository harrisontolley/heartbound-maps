import { describe, it, expect } from "vitest";
import { initialBearingDeg } from "./bearing";
import type { LatLng } from "../types";

const ORIGIN: LatLng = { lat: 0, lng: 0 };

describe("initialBearingDeg", () => {
  it("points due north (0°)", () => {
    expect(initialBearingDeg(ORIGIN, { lat: 1, lng: 0 })).toBeCloseTo(0, 6);
  });

  it("points due east (90°)", () => {
    expect(initialBearingDeg(ORIGIN, { lat: 0, lng: 1 })).toBeCloseTo(90, 6);
  });

  it("points due south (180°)", () => {
    expect(initialBearingDeg(ORIGIN, { lat: -1, lng: 0 })).toBeCloseTo(180, 6);
  });

  it("points due west (270°)", () => {
    expect(initialBearingDeg(ORIGIN, { lat: 0, lng: -1 })).toBeCloseTo(270, 6);
  });

  it("always returns a value in [0, 360)", () => {
    const b = initialBearingDeg(ORIGIN, { lat: 0, lng: -1 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });

  it("computes Brisbane→Sydney as ~193° (slightly west of due south)", () => {
    // NOTE: the spec prose says ~209°, but the standard great-circle formula
    // (which the spec provides as code) yields ~193.2°. Sydney is west of
    // Brisbane, so the bearing is slightly west of due south. Still "SSW".
    const b = initialBearingDeg(
      { lat: -27.4698, lng: 153.0251 },
      { lat: -33.8688, lng: 151.2093 },
    );
    expect(b).toBeGreaterThan(191);
    expect(b).toBeLessThan(195);
  });
});

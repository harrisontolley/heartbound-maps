import { describe, it, expect } from "vitest";
import { haversineKm } from "./haversine";
import type { LatLng } from "../types";

const BRISBANE: LatLng = { lat: -27.4698, lng: 153.0251 };
const SYDNEY: LatLng = { lat: -33.8688, lng: 151.2093 };

describe("haversineKm", () => {
  it("computes Brisbane→Sydney as ~732 km (spec sanity check ≈730)", () => {
    const d = haversineKm(BRISBANE, SYDNEY);
    expect(d).toBeGreaterThan(728);
    expect(d).toBeLessThan(736);
  });

  it("is zero for identical points", () => {
    expect(haversineKm(BRISBANE, BRISBANE)).toBeCloseTo(0, 6);
  });

  it("is symmetric", () => {
    expect(haversineKm(BRISBANE, SYDNEY)).toBeCloseTo(
      haversineKm(SYDNEY, BRISBANE),
      9,
    );
  });

  it("computes ~111.19 km for one degree of latitude at the equator", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeCloseTo(111.19, 1);
  });
});

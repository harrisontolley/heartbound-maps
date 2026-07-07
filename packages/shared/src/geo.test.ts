import { describe, expect, it } from "vitest";
import {
  compass16,
  fmtDistance,
  haversineKm,
  initialBearingDeg,
  rhumbBearingDeg,
  rhumbDistanceKm,
} from "./geo.js";

// Ported test cases from frontend/src/lib/geo/{haversine,bearing,compass,
// rhumb,format}.test.ts — this module is a backend-facing re-port of those
// pure, already-proven functions (see coordinateStory.ts, the only consumer),
// so the ported cases confirm parity rather than re-deriving trust from
// scratch. See frontend/README.md's "Note on the spec's sanity check" for why
// the Brisbane→Sydney bearing is ~193°, not the ~209° the original spec prose
// suggested.

const BRISBANE = { lat: -27.4698, lng: 153.0251 };
const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const CAPE_TOWN = { lat: -33.9249, lng: 18.4241 };

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
    expect(haversineKm(BRISBANE, SYDNEY)).toBeCloseTo(haversineKm(SYDNEY, BRISBANE), 9);
  });

  it("computes ~111.19 km for one degree of latitude at the equator", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeCloseTo(111.19, 1);
  });
});

describe("initialBearingDeg", () => {
  const ORIGIN = { lat: 0, lng: 0 };

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
    const b = initialBearingDeg(BRISBANE, SYDNEY);
    expect(b).toBeGreaterThan(191);
    expect(b).toBeLessThan(195);
  });
});

describe("compass16", () => {
  it("maps the four cardinals", () => {
    expect(compass16(0)).toBe("N");
    expect(compass16(90)).toBe("E");
    expect(compass16(180)).toBe("S");
    expect(compass16(270)).toBe("W");
  });

  it("maps the Brisbane→Sydney bearing (~193°) to SSW", () => {
    expect(compass16(193.2)).toBe("SSW");
  });

  it("wraps 360° back to N", () => {
    expect(compass16(360)).toBe("N");
  });

  it("rounds to the nearest 16-point sector", () => {
    expect(compass16(22.5)).toBe("NNE");
    expect(compass16(348.75)).toBe("N"); // 15.5 → rounds to 16 → 0 → N
  });
});

describe("rhumbBearingDeg", () => {
  it("points nearly due west for Brisbane → Cape Town (the map intuition)", () => {
    // Rhumb ≈ 267° (WbS); the great circle is ≈ 218° (SW) — the ~49° gap is
    // the whole reason the studio offers a bearing-mode toggle.
    expect(rhumbBearingDeg(BRISBANE, CAPE_TOWN)).toBeCloseTo(266.8, 0);
    expect(initialBearingDeg(BRISBANE, CAPE_TOWN)).toBeCloseTo(217.7, 0);
  });

  it("is due east / north for axis-aligned moves", () => {
    expect(rhumbBearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(90, 5);
    expect(rhumbBearingDeg({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(0, 5);
  });

  it("takes the short way across the antimeridian", () => {
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

describe("fmtDistance", () => {
  it("formats km under 1000 exactly", () => {
    expect(fmtDistance(732, "km")).toBe("732 km");
  });

  it("converts km to miles", () => {
    expect(fmtDistance(732, "mi")).toBe("455 mi");
  });

  it("rounds large distances to the nearest 10 and groups thousands", () => {
    expect(fmtDistance(9203, "km")).toBe("9,200 km");
  });

  it("formats exactly 1000 km", () => {
    expect(fmtDistance(1000, "km")).toBe("1,000 km");
  });

  it("formats zero", () => {
    expect(fmtDistance(0, "km")).toBe("0 km");
  });
});

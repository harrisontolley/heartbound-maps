import { describe, it, expect } from "vitest";
import {
  buildProjection,
  makeProjector,
  normalizeLngDelta,
  unwrapLongitudes,
  wrapLngInto,
  type GeoBounds,
} from "./worldProjection";

describe("normalizeLngDelta", () => {
  it("leaves small deltas untouched", () => {
    expect(normalizeLngDelta(-47.4)).toBeCloseTo(-47.4, 6);
  });
  it("wraps a delta past +180 to the short way", () => {
    expect(normalizeLngDelta(-213.65)).toBeCloseTo(146.35, 6);
  });
  it("always lands in (-180, 180]", () => {
    for (const d of [359, -359, 540, -540, 181, -181]) {
      const n = normalizeLngDelta(d);
      expect(n).toBeGreaterThan(-180);
      expect(n).toBeLessThanOrEqual(180);
    }
  });
});

describe("unwrapLongitudes", () => {
  it("makes every consecutive leg take the short path (Tokyo → New York)", () => {
    const u = unwrapLongitudes([139.65, -74]);
    expect(u[0]).toBeCloseTo(139.65, 6);
    expect(Math.abs(u[1] - u[0])).toBeLessThanOrEqual(180);
    expect(u[1]).toBeCloseTo(286.0, 1);
  });
  it("returns [] for no stops", () => {
    expect(unwrapLongitudes([])).toEqual([]);
  });
});

describe("wrapLngInto", () => {
  it("shifts a longitude into the window around the centre", () => {
    expect(wrapLngInto(-170, 170)).toBeCloseTo(190, 6);
  });
});

describe("makeProjector", () => {
  const bounds: GeoBounds = { minLng: -180, maxLng: 180, minLat: -90, maxLat: 90 };
  const project = makeProjector(bounds, { width: 360, height: 180 });

  it("maps the centre of the world to the centre of the canvas", () => {
    expect(project(0, 0)).toEqual({ x: 180, y: 90 });
  });
  it("maps the top-left geo corner to (0, 0)", () => {
    expect(project(-180, 90)).toEqual({ x: 0, y: 0 });
  });
  it("maps the bottom-right geo corner to (W, H)", () => {
    expect(project(180, -90)).toEqual({ x: 360, y: 180 });
  });
});

describe("buildProjection", () => {
  const stops = [
    { lat: -33.8688, lng: 151.2093 },
    { lat: 1.3521, lng: 103.8198 },
    { lat: 35.6762, lng: 139.6503 },
    { lat: 40.7128, lng: -74.006 },
  ];

  it("keeps every world-mode marker inside the canvas", () => {
    const { points, view } = buildProjection(stops, "world", { width: 1400, height: 700 });
    expect(points).toHaveLength(stops.length);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(view.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(view.height);
    }
  });

  it("falls back to the full globe with no stops", () => {
    const { bounds, points } = buildProjection([], "world");
    expect(points).toEqual([]);
    expect(bounds).toEqual({ minLng: -180, maxLng: 180, minLat: -90, maxLat: 90 });
  });

  it("fit mode zooms tighter than world mode", () => {
    const world = buildProjection(stops, "world");
    const fit = buildProjection(stops, "fit");
    const span = (b: GeoBounds) => b.maxLng - b.minLng;
    expect(span(fit.bounds)).toBeLessThan(span(world.bounds));
  });
});

import { describe, it, expect } from "vitest";
import { computeLayout } from "./computeLayout";
import { defaultLayoutConfig } from "./config";
import { rectsOverlap } from "./aabb";
import { bearingToVec } from "../geo/projection";
import type { Computed } from "../types";
import type { MeasureFn } from "./types";

// Deterministic stub measurer: fixed two-line label box. (Real measurement uses
// canvas in the browser; the engine is decoupled from it via this MeasureFn.)
const measure: MeasureFn = () => ({ w: 160, h: 60 });

function comp(over: Partial<Computed> & { id: string; bearingDeg: number }): Computed {
  return {
    label: "X",
    fullName: "",
    lat: 0,
    lng: 0,
    affiliation: "visited",
    distanceKm: 1000,
    ...over,
  };
}

function assertNoOverlaps(out: ReturnType<typeof computeLayout>, pad: number) {
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      expect(
        rectsOverlap(out[i].labelBox, out[j].labelBox, pad),
        `labels ${out[i].id} and ${out[j].id} overlap`,
      ).toBe(false);
    }
  }
}

describe("computeLayout", () => {
  it("never changes an arrow's bearing — angle is sacred", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    const items = [
      comp({ id: "a", bearingDeg: 10 }),
      comp({ id: "b", bearingDeg: 200 }),
      comp({ id: "c", bearingDeg: 10.5 }),
    ];
    const out = computeLayout(items, cfg, measure);
    for (const o of out) {
      const v = bearingToVec(o.bearingDeg);
      expect(o.dir.x).toBeCloseTo(v.x, 9);
      expect(o.dir.y).toBeCloseTo(v.y, 9);
      // tip lies exactly along the bearing ray from the center
      expect(o.tip.x).toBeCloseTo(cfg.cx + v.x * o.radius, 6);
      expect(o.tip.y).toBeCloseTo(cfg.cy + v.y * o.radius, 6);
    }
  });

  it("stacks near-identical bearings along the spoke, closest place shortest", () => {
    // Use a (near-)vertical cluster: radius-stacking is only physically possible
    // when the spoke is vertical (a horizontal stack would run off the canvas and
    // is instead resolved by perpendicular separation — see the stress test).
    const cfg = defaultLayoutConfig(1000, 1500);
    const items = [
      comp({ id: "near", bearingDeg: 180, distanceKm: 500 }),
      comp({ id: "far", bearingDeg: 183, distanceKm: 2000 }),
    ];
    const out = computeLayout(items, cfg, measure);
    const near = out.find((o) => o.id === "near")!;
    const far = out.find((o) => o.id === "far")!;
    expect(near.radius).toBeLessThan(far.radius);
  });

  it("resolves a trio sharing an identical bearing without overlap", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    const items = [
      comp({ id: "a", bearingDeg: 90, distanceKm: 300 }),
      comp({ id: "b", bearingDeg: 90, distanceKm: 600 }),
      comp({ id: "c", bearingDeg: 90, distanceKm: 900 }),
    ];
    const out = computeLayout(items, cfg, measure);
    assertNoOverlaps(out, cfg.boxPadding);
  });

  it("resolves a dense same-direction cluster (stress) without overlap", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    const items = Array.from({ length: 6 }, (_, i) =>
      comp({ id: String(i), bearingDeg: 90 + i * 2, distanceKm: 500 + i * 120 }),
    );
    const out = computeLayout(items, cfg, measure);
    assertNoOverlaps(out, cfg.boxPadding);
  });

  it("resolves a well-spread set of 8 without overlap", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    const items = Array.from({ length: 8 }, (_, i) =>
      comp({ id: String(i), bearingDeg: i * 45 + 5, distanceKm: 1000 }),
    );
    const out = computeLayout(items, cfg, measure);
    assertNoOverlaps(out, cfg.boxPadding);
  });

  it("keeps every label box inside the poster margins (no off-page text)", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    // A very wide label (e.g. "Los Angeles") pointing due west would, without
    // clamping, overhang the left edge because maxRadius only bounds the tip.
    const wide: MeasureFn = () => ({ w: 340, h: 60 });
    const items = Array.from({ length: 8 }, (_, i) =>
      comp({ id: String(i), bearingDeg: i * 45, distanceKm: 1000 }),
    );
    const out = computeLayout(items, cfg, wide);
    for (const o of out) {
      const b = o.labelBox;
      expect(b.x, `${o.id} left edge`).toBeGreaterThanOrEqual(cfg.margin - 1e-6);
      expect(b.x + b.w, `${o.id} right edge`).toBeLessThanOrEqual(
        cfg.width - cfg.margin + 1e-6,
      );
      expect(b.y, `${o.id} top edge`).toBeGreaterThanOrEqual(cfg.margin - 1e-6);
      expect(b.y + b.h, `${o.id} bottom edge`).toBeLessThanOrEqual(
        cfg.height - cfg.margin + 1e-6,
      );
    }
  });

  it("returns one placement per input", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    const items = [comp({ id: "a", bearingDeg: 30 }), comp({ id: "b", bearingDeg: 210 })];
    expect(computeLayout(items, cfg, measure)).toHaveLength(2);
  });

  describe("distance magnitude", () => {
    it("makes a farther place's arrow longer even on a different bearing", () => {
      // Distinct bearings (no same-direction cluster) — with scaling on, length is
      // driven purely by distance, so the farther place must have the longer arrow.
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "near", bearingDeg: 0, distanceKm: 500 }),
        comp({ id: "far", bearingDeg: 90, distanceKm: 5000 }),
      ];
      const out = computeLayout(items, cfg, measure);
      const near = out.find((o) => o.id === "near")!;
      const far = out.find((o) => o.id === "far")!;
      expect(near.radius).toBeLessThan(far.radius);
    });

    it("orders arrow length by distance across a spread set", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "a", bearingDeg: 0, distanceKm: 200 }),
        comp({ id: "b", bearingDeg: 90, distanceKm: 1000 }),
        comp({ id: "c", bearingDeg: 180, distanceKm: 5000 }),
        comp({ id: "d", bearingDeg: 270, distanceKm: 15000 }),
      ];
      const out = computeLayout(items, cfg, measure);
      const r = (id: string) => out.find((o) => o.id === id)!.radius;
      expect(r("a")).toBeLessThan(r("b"));
      expect(r("b")).toBeLessThan(r("c"));
      expect(r("c")).toBeLessThan(r("d"));
    });

    it("keeps every arrow length within [minRadius, maxRadius]", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "a", bearingDeg: 0, distanceKm: 80 }),
        comp({ id: "b", bearingDeg: 90, distanceKm: 1200 }),
        comp({ id: "c", bearingDeg: 180, distanceKm: 9000 }),
        comp({ id: "d", bearingDeg: 270, distanceKm: 17000 }),
      ];
      const out = computeLayout(items, cfg, measure);
      for (const o of out) {
        expect(o.radius).toBeGreaterThanOrEqual(cfg.minRadius);
        expect(o.radius).toBeLessThanOrEqual(cfg.maxRadius);
      }
    });

    it("keeps uniform arrow length when scaling is disabled", () => {
      // The same distinct-bearing, different-distance pair as above, but with the
      // toggle off, must fall back to identical (baseRadius) lengths.
      const cfg = defaultLayoutConfig(1000, 1500, { scaleByDistance: false });
      const items = [
        comp({ id: "near", bearingDeg: 0, distanceKm: 500 }),
        comp({ id: "far", bearingDeg: 90, distanceKm: 5000 }),
      ];
      const out = computeLayout(items, cfg, measure);
      const near = out.find((o) => o.id === "near")!;
      const far = out.find((o) => o.id === "far")!;
      expect(near.radius).toBe(cfg.baseRadius);
      expect(far.radius).toBe(cfg.baseRadius);
    });
  });
});

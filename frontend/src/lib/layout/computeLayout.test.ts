import { describe, it, expect } from "vitest";
import { computeLayout, computeLayoutWithDiagnostics } from "./computeLayout";
import { defaultLayoutConfig } from "./config";
import { clustersByBearing, minVisibleRadius } from "./radii";
import { bearingToVec } from "../geo/projection";
import type { Computed } from "../types";
import type { LaidOut, LayoutConfig, MeasureFn } from "./types";
import { leaderCrossings, verifyLayout } from "./verify";

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

/** Per-id label sizes (mirrors what the canvas measurer produces in prod). */
function sized(sizes: Record<string, { w: number; h: number }>, fallback = { w: 180, h: 64 }): MeasureFn {
  return (it) => sizes[it.id] ?? fallback;
}

/** Every hard invariant must hold: no box overlaps, no label on any arrow
 * (own or others'), in-page, off the home disc. */
function assertClean(out: LaidOut[], cfg: LayoutConfig) {
  const problems = verifyLayout(out, cfg);
  expect(problems, JSON.stringify(problems)).toEqual([]);
}

/** Same-direction clusters: a label may sit above a sibling's only when its
 * arrow's tip is higher OR its bearing is more northerly (angular order) —
 * same-bearing stacks must strictly follow tip order. */
function assertClusterOrder(out: LaidOut[], cfg: LayoutConfig) {
  for (const cluster of clustersByBearing(out, cfg.clusterAngleDeg)) {
    for (const a of cluster) {
      for (const b of cluster) {
        if (a === b) continue;
        const ay = a.labelBox.y + a.labelBox.h / 2;
        const by = b.labelBox.y + b.labelBox.h / 2;
        if (ay >= by - 1e-6) continue; // only judge "a above b" pairs
        const tipOk = a.tip.y <= b.tip.y + 1e-6;
        const angleOk = a.dir.y < b.dir.y - 1e-9;
        expect(
          tipOk || angleOk,
          `cluster order: ${a.id} sits above ${b.id} but has neither the higher tip nor the more northerly bearing`,
        ).toBe(true);
      }
    }
  }
}

const cyOf = (out: LaidOut[], id: string) => {
  const o = out.find((x) => x.id === id)!;
  return o.labelBox.y + o.labelBox.h / 2;
};

/** Distance from a label's own tip to the nearest point of its box. */
function tipClearance(o: LaidOut): number {
  const b = o.labelBox;
  const qx = Math.min(Math.max(o.tip.x, b.x), b.x + b.w);
  const qy = Math.min(Math.max(o.tip.y, b.y), b.y + b.h);
  return Math.hypot(qx - o.tip.x, qy - o.tip.y);
}

describe("computeLayout", () => {
  it("returns [] for no places and one placement per input", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    expect(computeLayout([], cfg, measure)).toEqual([]);
    const items = [comp({ id: "a", bearingDeg: 30 }), comp({ id: "b", bearingDeg: 210 })];
    expect(computeLayout(items, cfg, measure)).toHaveLength(2);
  });

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

  it("rests an uncrowded label at its tip with no leader (icon-at-tip)", () => {
    const cfg = defaultLayoutConfig(1000, 1500);
    const small: MeasureFn = () => ({ w: 140, h: 60 });
    const out = computeLayout([comp({ id: "a", bearingDeg: 45, distanceKm: 3000 })], cfg, small);
    const o = out[0];
    expect(o.needsLeader).toBe(false);
    expect(o.labelBox.anchor).toBe("start");
    expect(o.labelBox.x).toBeCloseTo(o.tip.x + o.dir.x * cfg.tipIconGap, 6);
    expect(o.labelBox.y + o.labelBox.h / 2).toBeCloseTo(o.tip.y + o.dir.y * cfg.tipIconGap, 6);
  });

  // ---------------------------------------------------------------- T1 -----
  describe("T1: Berlin → Jerusalem + Shanghai", () => {
    it("keeps Shanghai's label off its own arrow", () => {
      // Reported bug: Shanghai seeds long, its wide label overflowed the right
      // margin, and the old inward clamp dragged it back onto the shaft.
      const cfg = defaultLayoutConfig(1000, 1500);
      const m = sized({ shanghai: { w: 210, h: 64 }, jerusalem: { w: 180, h: 64 } });
      const items = [
        comp({ id: "shanghai", bearingDeg: 57.1, distanceKm: 8397 }),
        comp({ id: "jerusalem", bearingDeg: 134.1, distanceKm: 2901 }),
      ];
      const out = computeLayout(items, cfg, m);
      assertClean(out, cfg);
    });
  });

  // ---------------------------------------------------------------- T2 -----
  describe("T2: Brisbane → San Francisco + New York (near-collinear NE)", () => {
    const SIZES = {
      sf: { w: 150, h: 64 },
      ny: { w: 212, h: 64 },
      london: { w: 170, h: 64 },
    };
    it("separates the pair with nothing on any arrow", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "ny", bearingDeg: 58.46, distanceKm: 15501 }),
      ];
      const out = computeLayout(items, cfg, sized(SIZES));
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
      expect(leaderCrossings(out, { x: cfg.cx, y: cfg.cy })).toBe(0);
    });

    it("stays clean when London joins", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "ny", bearingDeg: 58.46, distanceKm: 15501 }),
        comp({ id: "london", bearingDeg: 327.33, distanceKm: 16526 }),
      ];
      const out = computeLayout(items, cfg, sized(SIZES));
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
      expect(leaderCrossings(out, { x: cfg.cx, y: cfg.cy })).toBe(0);
    });
  });

  // ---------------------------------------------------------------- T3 -----
  describe("T3: Brisbane → Bangkok + Chiang Mai (+ Shanghai + London)", () => {
    const SIZES = {
      bangkok: { w: 168, h: 64 },
      chiangmai: { w: 230, h: 64 }, // "Chiang Mai" is long — the reported cutoff
      shanghai: { w: 190, h: 64 },
      london: { w: 160, h: 64 },
    };

    it("keeps both NW labels near their tips, split evenly", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "bangkok", bearingDeg: 302.1, distanceKm: 7283 }),
        comp({ id: "chiangmai", bearingDeg: 305.28, distanceKm: 7766 }),
      ];
      const out = computeLayout(items, cfg, sized(SIZES));
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
      // Both labels stay close to their arrows — no page-crossing leader.
      for (const o of out) {
        expect(tipClearance(o), `${o.id} drifted too far from its tip`).toBeLessThan(120);
      }
    });

    it("keeps tip order with Shanghai + London added (Shanghai topmost)", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "bangkok", bearingDeg: 302.1, distanceKm: 7283 }),
        comp({ id: "chiangmai", bearingDeg: 305.28, distanceKm: 7766 }),
        comp({ id: "shanghai", bearingDeg: 330.66, distanceKm: 7335 }),
        comp({ id: "london", bearingDeg: 327.33, distanceKm: 16526 }),
      ];
      const out = computeLayout(items, cfg, sized(SIZES));
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
      expect(leaderCrossings(out, { x: cfg.cx, y: cfg.cy })).toBe(0);
      // Shanghai's arrow is the most northerly of the western fan; its label
      // must not end up at the bottom of the stack (the reported defect).
      const west = ["bangkok", "chiangmai", "shanghai", "london"];
      const lowest = west.reduce((a, b) => (cyOf(out, a) > cyOf(out, b) ? a : b));
      expect(lowest).not.toBe("shanghai");
    });
  });

  // ---------------------------------------------------------------- T4 -----
  describe("T4: New York → Tokyo, Seattle, London, Bangkok, Miami", () => {
    const SIZES = {
      tokyo: { w: 160, h: 64 },
      seattle: { w: 180, h: 64 },
      london: { w: 170, h: 64 },
      bangkok: { w: 186, h: 64 },
      miami: { w: 150, h: 64 },
    };
    it("keeps every label off every arrow with breathing room at the tips", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "tokyo", bearingDeg: 332.99, distanceKm: 10852 }),
        comp({ id: "seattle", bearingDeg: 297.97, distanceKm: 3866 }),
        comp({ id: "london", bearingDeg: 51.21, distanceKm: 5570 }),
        comp({ id: "bangkok", bearingDeg: 6.54, distanceKm: 13932 }),
        comp({ id: "miami", bearingDeg: 200.87, distanceKm: 1758 }),
      ];
      const out = computeLayout(items, cfg, sized(SIZES));
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
      expect(leaderCrossings(out, { x: cfg.cx, y: cfg.cy })).toBe(0);
      // Icons must not crowd the arrowheads (the reported Tokyo defect).
      for (const o of out) {
        expect(tipClearance(o), `${o.id} icon crowds its arrowhead`).toBeGreaterThanOrEqual(6);
      }
    });
  });

  // ---------------------------------------------------------------- T5 -----
  describe("T5: Jakarta → Brisbane, Melbourne, Sydney (near-equal distances)", () => {
    const SIZES = {
      brisbane: { w: 190, h: 64 },
      melbourne: { w: 210, h: 64 },
      sydney: { w: 160, h: 64 },
    };
    const items = [
      comp({ id: "brisbane", bearingDeg: 121.49, distanceKm: 5410 }),
      comp({ id: "melbourne", bearingDeg: 138.04, distanceKm: 5207 }),
      comp({ id: "sydney", bearingDeg: 130.15, distanceKm: 5496 }),
    ];

    it("gives near-equal distances near-equal arrow lengths", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const out = computeLayout(items, cfg, sized(SIZES));
      const radii = out.map((o) => o.radius);
      const rMax = Math.max(...radii);
      const rMin = Math.min(...radii);
      // Distances differ by ~5.5% — arrows must not differ wildly (the old map
      // stretched them across the full range, making Melbourne look tiny).
      expect(rMax / rMin).toBeLessThan(1.35);
    });

    it("keeps Melbourne's label with Melbourne's arrow (order matches tips)", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const out = computeLayout(items, cfg, sized(SIZES));
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
      expect(leaderCrossings(out, { x: cfg.cx, y: cfg.cy })).toBe(0);
      // Melbourne's arrow points the most southerly of the fan — its label must
      // not be the northmost (the reported defect).
      const ids = ["brisbane", "melbourne", "sydney"];
      const topmost = ids.reduce((a, b) => (cyOf(out, a) < cyOf(out, b) ? a : b));
      expect(topmost).not.toBe("melbourne");
    });
  });

  // ---------------------------------------------------- behavior suites -----
  describe("split the difference", () => {
    it("moves BOTH overlapping labels, not just one", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const wide: MeasureFn = () => ({ w: 240, h: 80 });
      const a = comp({ id: "a", bearingDeg: 0, distanceKm: 3000 });
      const b = comp({ id: "b", bearingDeg: 22, distanceKm: 3000 });
      const seedCenter = (item: Computed) => {
        const o = computeLayout([item], cfg, wide)[0];
        return { x: o.labelBox.x + o.labelBox.w / 2, y: o.labelBox.y + o.labelBox.h / 2 };
      };
      const sa = seedCenter(a);
      const sb = seedCenter(b);
      const out = computeLayout([a, b], cfg, wide);
      const fa = out.find((o) => o.id === "a")!;
      const fb = out.find((o) => o.id === "b")!;
      const da = Math.hypot(fa.labelBox.x + fa.labelBox.w / 2 - sa.x, fa.labelBox.y + fa.labelBox.h / 2 - sa.y);
      const db = Math.hypot(fb.labelBox.x + fb.labelBox.w / 2 - sb.x, fb.labelBox.y + fb.labelBox.h / 2 - sb.y);
      expect(da).toBeGreaterThan(5);
      expect(db).toBeGreaterThan(5);
      expect(Math.max(da, db) / Math.min(da, db)).toBeLessThan(5);
      assertClean(out, cfg);
    });
  });

  describe("same-direction stacks", () => {
    it("stacks near-identical bearings along the spoke, closest place shortest", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "near", bearingDeg: 180, distanceKm: 500 }),
        comp({ id: "far", bearingDeg: 183, distanceKm: 2000 }),
      ];
      const out = computeLayout(items, cfg, measure);
      const near = out.find((o) => o.id === "near")!;
      const far = out.find((o) => o.id === "far")!;
      expect(near.radius).toBeLessThan(far.radius);
      assertClean(out, cfg);
    });

    it("resolves a trio sharing an identical bearing", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "a", bearingDeg: 70, distanceKm: 300 }),
        comp({ id: "b", bearingDeg: 70, distanceKm: 600 }),
        comp({ id: "c", bearingDeg: 70, distanceKm: 900 }),
      ];
      const out = computeLayout(items, cfg, measure);
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
    });

    it("resolves a dense same-direction fan of 6", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = Array.from({ length: 6 }, (_, i) =>
        comp({ id: String(i), bearingDeg: 90 + i * 2, distanceKm: 500 + i * 120 }),
      );
      const out = computeLayout(items, cfg, measure);
      assertClean(out, cfg);
    });

    it("resolves an 8-arrow fan packed into 20 degrees", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = Array.from({ length: 8 }, (_, i) =>
        comp({ id: String(i), bearingDeg: 40 + i * (20 / 7), distanceKm: 800 + i * 900 }),
      );
      const out = computeLayout(items, cfg, measure);
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
    });
  });

  describe("height ordering follows the arrows", () => {
    it("places New York (farther, NE) with SF cleanly — order matches tips", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const m = sized({ ny: { w: 212, h: 64 }, sf: { w: 150, h: 64 }, bkk: { w: 168, h: 64 } });
      const items = [
        comp({ id: "ny", bearingDeg: 58.46, distanceKm: 15501 }),
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "bkk", bearingDeg: 302.1, distanceKm: 7283 }),
      ];
      const out = computeLayout(items, cfg, m);
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
    });

    it("a south-pointing fan puts the farther city's label lower", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const wide: MeasureFn = () => ({ w: 220, h: 64 });
      const items = [
        comp({ id: "near", bearingDeg: 179, distanceKm: 9000 }),
        comp({ id: "mid", bearingDeg: 181, distanceKm: 10500 }),
        comp({ id: "far", bearingDeg: 180, distanceKm: 12000 }),
      ];
      const out = computeLayout(items, cfg, wide);
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
    });
  });

  describe("distance magnitude", () => {
    it("orders arrow length by distance (bearings with room)", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const small: MeasureFn = () => ({ w: 120, h: 60 });
      const items = [
        comp({ id: "a", bearingDeg: 20, distanceKm: 500 }),
        comp({ id: "b", bearingDeg: 70, distanceKm: 1000 }),
        comp({ id: "c", bearingDeg: 200, distanceKm: 2000 }),
        comp({ id: "d", bearingDeg: 250, distanceKm: 4000 }),
      ];
      const out = computeLayout(items, cfg, small);
      const r = (id: string) => out.find((o) => o.id === id)!.radius;
      expect(r("a")).toBeLessThan(r("b"));
      expect(r("b")).toBeLessThan(r("c"));
      expect(r("c")).toBeLessThan(r("d"));
    });

    it("keeps uniform arrow length when scaling is disabled", () => {
      const cfg = defaultLayoutConfig(1000, 1500, { scaleByDistance: false });
      const items = [
        comp({ id: "near", bearingDeg: 30, distanceKm: 500 }),
        comp({ id: "far", bearingDeg: 210, distanceKm: 5000 }),
      ];
      const out = computeLayout(items, cfg, measure);
      expect(out.find((o) => o.id === "near")!.radius).toBe(cfg.baseRadius);
      expect(out.find((o) => o.id === "far")!.radius).toBe(cfg.baseRadius);
    });
  });

  describe("page containment", () => {
    it("keeps very wide labels fully on-page in every direction", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const wide: MeasureFn = () => ({ w: 300, h: 64 });
      const items = Array.from({ length: 8 }, (_, i) =>
        comp({ id: String(i), bearingDeg: i * 45, distanceKm: 1000 + i * 500 }),
      );
      const out = computeLayout(items, cfg, wide);
      assertClean(out, cfg);
    });

    it("keeps a south fan above the reserved bottom band", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const wide: MeasureFn = () => ({ w: 220, h: 64 });
      const items = Array.from({ length: 5 }, (_, i) =>
        comp({ id: String(i), bearingDeg: 160 + i * 10, distanceKm: 2000 + i * 3000 }),
      );
      const out = computeLayout(items, cfg, wide);
      assertClean(out, cfg);
      for (const o of out) {
        expect(o.labelBox.y + o.labelBox.h).toBeLessThanOrEqual(cfg.safeBottom + 1e-6);
      }
    });
  });

  describe("edge cases", () => {
    const cfg = defaultLayoutConfig(1000, 1500);

    it("n=2 antipodal", () => {
      const out = computeLayout(
        [comp({ id: "a", bearingDeg: 10, distanceKm: 8000 }), comp({ id: "b", bearingDeg: 190, distanceKm: 9000 })],
        cfg,
        measure,
      );
      assertClean(out, cfg);
      // Uncrowded → both at rest, no leaders.
      expect(out.every((o) => !o.needsLeader)).toBe(true);
    });

    it("four places on the identical bearing", () => {
      const items = Array.from({ length: 4 }, (_, i) =>
        comp({ id: String(i), bearingDeg: 135, distanceKm: 1000 + i * 800 }),
      );
      const out = computeLayout(items, cfg, measure);
      assertClean(out, cfg);
      assertClusterOrder(out, cfg);
    });

    it("12 labels stays clean (last-resort territory)", () => {
      const items = Array.from({ length: 12 }, (_, i) =>
        comp({ id: String(i).padStart(2, "0"), bearingDeg: (i * 30 + 10) % 360, distanceKm: 500 + i * 1200 }),
      );
      const out = computeLayout(items, cfg, measure);
      assertClean(out, cfg);
    });

    it("is deterministic (identical runs, identical output)", () => {
      const items = [
        comp({ id: "bangkok", bearingDeg: 302.1, distanceKm: 7283 }),
        comp({ id: "chiangmai", bearingDeg: 305.28, distanceKm: 7766 }),
        comp({ id: "shanghai", bearingDeg: 330.66, distanceKm: 7335 }),
        comp({ id: "london", bearingDeg: 327.33, distanceKm: 16526 }),
      ];
      const a = computeLayout(items, cfg, measure).map((o) => ({ r: o.radius, b: o.labelBox }));
      const b = computeLayout(items, cfg, measure).map((o) => ({ r: o.radius, b: o.labelBox }));
      expect(a).toEqual(b);
    });
  });

  describe("diagnostics", () => {
    it("reports a well-spread set as primary-resolved with no fallback", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = Array.from({ length: 8 }, (_, i) =>
        comp({ id: String(i), bearingDeg: i * 45 + 5, distanceKm: 1000 }),
      );
      const { items: out, diagnostics } = computeLayoutWithDiagnostics(items, cfg, measure);
      assertClean(out, cfg);
      expect(diagnostics.primaryResolved).toBe(true);
      expect(diagnostics.fallbackUsed).toBe(false);
      expect(diagnostics.converged).toBe(true);
    });
  });

  // Deterministic PRNG (Math.random is unavailable / non-reproducible here).
  const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  describe("stress: every seeded poster satisfies every hard invariant", () => {
    const SIZES: [number, number, number][] = [
      // [width, height, seeds]
      [1000, 1500, 300],
      [1200, 1200, 100],
      [1500, 1000, 100],
      [1080, 1920, 100],
    ];

    for (const [W, H, SEEDS] of SIZES) {
      it(`holds across ${SEEDS} seeded configs at ${W}x${H}`, () => {
        const cfg = defaultLayoutConfig(W, H);
        const floor = minVisibleRadius(cfg);
        for (let seed = 0; seed < SEEDS; seed++) {
          const rng = mulberry32(seed + 1);
          const n = 3 + Math.floor(rng() * 6); // 3..8 cities
          const items = Array.from({ length: n }, (_, k) => {
            // Mix spread bearings with jittered same-direction clusters and a
            // wide distance range (far corner cities).
            const cluster = Math.floor(rng() * 4) * 90;
            const bearingDeg = (cluster + (rng() - 0.5) * 40 + 360) % 360;
            return comp({ id: String(k), bearingDeg, distanceKm: 50 + Math.floor(rng() * 17950) });
          });
          const widths = new Map(items.map((it) => [it.id, 140 + Math.floor(rng() * 110)]));
          const m: MeasureFn = (it) => ({ w: widths.get(it.id)!, h: 64 });
          const out = computeLayout(items, cfg, m);

          const problems = verifyLayout(out, cfg);
          expect(problems, `seed ${seed} @ ${W}x${H}: ${JSON.stringify(problems)}`).toEqual([]);
          for (const o of out) {
            const v = bearingToVec(o.bearingDeg);
            expect(o.dir.x, `seed ${seed}: ${o.id} bearing drift`).toBeCloseTo(v.x, 9);
            expect(o.dir.y, `seed ${seed}: ${o.id} bearing drift`).toBeCloseTo(v.y, 9);
            expect(o.radius).toBeGreaterThanOrEqual(floor - 1e-6);
            expect(o.radius).toBeLessThanOrEqual(cfg.maxRadius + 1e-6);
          }
        }
      });
    }
  });
});

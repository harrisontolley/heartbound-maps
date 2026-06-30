import { describe, it, expect } from "vitest";
import { computeLayout } from "./computeLayout";
import { defaultLayoutConfig } from "./config";
import { rectsOverlap, segIntersectsRect } from "./aabb";
import { bearingToVec } from "../geo/projection";
import type { Computed } from "../types";
import type { LayoutConfig, MeasureFn } from "./types";

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

/** No label box may sit on any arrow's line (center → that arrow's tip) — including
 * its OWN line. The own line is tested at pad 0 (a literal overlap: the arrow ending
 * under its own text), since a label naturally sits a `labelGap` beyond its own tip. */
function assertNoSegmentOverlaps(
  out: ReturnType<typeof computeLayout>,
  cfg: LayoutConfig,
  pad: number,
) {
  const c = { x: cfg.cx, y: cfg.cy };
  for (let i = 0; i < out.length; i++) {
    for (let j = 0; j < out.length; j++) {
      const p = i === j ? 0 : pad;
      expect(
        segIntersectsRect(c, out[j].tip, out[i].labelBox, p),
        i === j
          ? `label ${out[i].id} sits on its OWN arrow line`
          : `label ${out[i].id} sits on arrow ${out[j].id}'s line`,
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

  // Bearings + distances below are the real great-circle values from Brisbane
  // (home) — the reported failing case. SF and NY are only ~5° apart, so NY's
  // long arrow line ran straight through SF's label before segment avoidance.
  describe("keeps labels off other arrows' lines", () => {
    it("separates the reported Brisbane → SF + NY near-collinear pair", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "ny", bearingDeg: 58.5, distanceKm: 15501 }),
      ];
      const out = computeLayout(items, cfg, measure);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });

    it("separates a near-collinear NE fan of five", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "la", bearingDeg: 58.6, distanceKm: 11565 }),
        comp({ id: "ny", bearingDeg: 58.5, distanceKm: 15501 }),
        comp({ id: "sea", bearingDeg: 44.4, distanceKm: 11848 }),
        comp({ id: "van", bearingDeg: 42.6, distanceKm: 11866 }),
      ];
      const out = computeLayout(items, cfg, measure);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });

    it("keeps a wide-label spread off every spoke", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const wide: MeasureFn = () => ({ w: 300, h: 60 });
      const items = Array.from({ length: 8 }, (_, i) =>
        comp({ id: String(i), bearingDeg: i * 45 + 5, distanceKm: 400 + i * 1800 }),
      );
      const out = computeLayout(items, cfg, wide);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });

    it("still keeps a same-bearing trio clear of the shared spoke", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const items = [
        comp({ id: "a", bearingDeg: 70, distanceKm: 300 }),
        comp({ id: "b", bearingDeg: 70, distanceKm: 600 }),
        comp({ id: "c", bearingDeg: 70, distanceKm: 900 }),
      ];
      const out = computeLayout(items, cfg, measure);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });
  });

  // Realistic canvas-measured "City / 12,345 km" two-line labels + the real
  // labelGap (16 + round(arrowheadSize*1.5) ≈ 57 for the bold template). The
  // 160×60 stub above does NOT reproduce production renders: real labels are
  // wider/asymmetric and the bigger gap drives them to the poster margins, where
  // the old resolver's perpendicular nudge stalled against the margin clamp and
  // left a residual overlap. These cases failed before the split/penetration
  // rewrite and must stay green.
  const REAL_SIZES: Record<string, { w: number; h: number }> = {
    sf: { w: 150, h: 64 },
    ny: { w: 212, h: 64 },
    la: { w: 158, h: 64 },
    sea: { w: 180, h: 64 },
    van: { w: 206, h: 64 },
  };
  const realMeasure: MeasureFn = (it) => REAL_SIZES[it.id] ?? { w: 190, h: 64 };

  describe("real-world renders (realistic label sizes + gap)", () => {
    it("separates Brisbane → SF + NY with production label sizes", () => {
      const cfg = defaultLayoutConfig(1000, 1500, { labelGap: 57 });
      const items = [
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "ny", bearingDeg: 58.5, distanceKm: 15501 }),
      ];
      const out = computeLayout(items, cfg, realMeasure);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });

    it("keeps a lone far NE city's wide label off its OWN arrow line", () => {
      // NY alone: farthest → arrow seeds to baseRadius and its tip lands near the
      // top-right corner. A wide label can't fit beyond the tip on-page, so the margin
      // clamp drags the box back over the tip — the arrow ends under its own title.
      const cfg = defaultLayoutConfig(1000, 1500, { labelGap: 57 });
      const wideStub: MeasureFn = () => ({ w: 260, h: 64 });
      const items = [comp({ id: "ny", bearingDeg: 58.5, distanceKm: 15501 })];
      const out = computeLayout(items, cfg, wideStub);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding); // now also checks the own line
    });

    it("separates a realistic near-collinear NE fan of five", () => {
      const cfg = defaultLayoutConfig(1000, 1500, { labelGap: 57 });
      const items = [
        comp({ id: "sf", bearingDeg: 53.7, distanceKm: 11395 }),
        comp({ id: "la", bearingDeg: 58.6, distanceKm: 11565 }),
        comp({ id: "ny", bearingDeg: 58.5, distanceKm: 15501 }),
        comp({ id: "sea", bearingDeg: 44.4, distanceKm: 11848 }),
        comp({ id: "van", bearingDeg: 42.6, distanceKm: 11866 }),
      ];
      const out = computeLayout(items, cfg, realMeasure);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });
  });

  describe("split the difference", () => {
    it("moves BOTH overlapping labels, not just one", () => {
      const cfg = defaultLayoutConfig(1000, 1500);
      const wide: MeasureFn = () => ({ w: 240, h: 80 });
      // Diverging bearings (22° apart, not a same-direction stack) whose wide seed
      // boxes overlap, away from any margin.
      const a = comp({ id: "a", bearingDeg: 0, distanceKm: 3000 });
      const b = comp({ id: "b", bearingDeg: 22, distanceKm: 3000 });
      const seedCenter = (item: Computed) => {
        const o = computeLayout([item], cfg, wide)[0];
        return {
          x: o.labelBox.x + o.labelBox.w / 2,
          y: o.labelBox.y + o.labelBox.h / 2,
        };
      };
      const sa = seedCenter(a);
      const sb = seedCenter(b);
      const out = computeLayout([a, b], cfg, wide);
      const fa = out.find((o) => o.id === "a")!;
      const fb = out.find((o) => o.id === "b")!;
      const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
        Math.hypot(p.x - q.x, p.y - q.y);
      const ca = { x: fa.labelBox.x + fa.labelBox.w / 2, y: fa.labelBox.y + fa.labelBox.h / 2 };
      const cb = { x: fb.labelBox.x + fb.labelBox.w / 2, y: fb.labelBox.y + fb.labelBox.h / 2 };
      const da = dist(ca, sa);
      const db = dist(cb, sb);
      // The old resolver moved only the shorter-radius label and pinned the other;
      // the new one shares the work, so BOTH end up displaced from their seed...
      expect(da).toBeGreaterThan(5);
      expect(db).toBeGreaterThan(5);
      // ...by roughly comparable amounts (neither does more than ~4× the other).
      expect(Math.max(da, db) / Math.min(da, db)).toBeLessThan(4);
      assertNoOverlaps(out, cfg.boxPadding);
    });
  });

  describe("margin clamp does not stall resolution", () => {
    it("resolves two wide labels driven against the same edge", () => {
      const cfg = defaultLayoutConfig(1000, 1500, { labelGap: 57 });
      const veryWide: MeasureFn = () => ({ w: 360, h: 70 });
      // Both near-east: their boxes are clamped to the right margin (same x), so the
      // overlap can only be cleared by the perpendicular (vertical) fallback — the
      // exact case the fixed-step nudge stalled on against the clamp.
      const items = [
        comp({ id: "a", bearingDeg: 88, distanceKm: 4000 }),
        comp({ id: "b", bearingDeg: 96, distanceKm: 4000 }),
      ];
      const out = computeLayout(items, cfg, veryWide);
      assertNoOverlaps(out, cfg.boxPadding);
      assertNoSegmentOverlaps(out, cfg, cfg.boxPadding);
    });
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

  // Convergence sweep. The own-line nudge is additive — it could in principle shove a
  // label into a fresh label-label / other-line overlap. On a *solvable* poster the
  // engine must drive ALL obstacle classes (incl. own line) to zero, so a residual
  // here would expose exactly that regression. Seeded + moderate-density so every
  // config is physically solvable and the assertion of strict zero is reliable.
  describe("stress: solvable posters always reach zero overlap (incl. own line)", () => {
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

    it("holds across 300 seeded configs with bearings + lengths intact", () => {
      const cfg = defaultLayoutConfig(1000, 1500, { labelGap: 57 });
      for (let seed = 0; seed < 300; seed++) {
        const rng = mulberry32(seed + 1);
        const n = 3 + Math.floor(rng() * 6); // 3..8 cities (solvable density)
        const items = Array.from({ length: n }, (_, k) => {
          // Mix spread bearings with jittered same-direction clusters (stresses the
          // stagger + collinear paths), and a wide distance range (far corner cities).
          const cluster = Math.floor(rng() * 4) * 90;
          const bearingDeg = (cluster + (rng() - 0.5) * 40 + 360) % 360;
          return comp({ id: String(k), bearingDeg, distanceKm: 50 + Math.floor(rng() * 17950) });
        });
        const widths = new Map(items.map((it) => [it.id, 140 + Math.floor(rng() * 110)]));
        const measure: MeasureFn = (it) => ({ w: widths.get(it.id)!, h: 64 });
        const out = computeLayout(items, cfg, measure);

        assertNoOverlaps(out, cfg.boxPadding); // (iii) label vs label
        assertNoSegmentOverlaps(out, cfg, cfg.boxPadding); // (i) own line (pad 0) + (ii) others
        for (const o of out) {
          const v = bearingToVec(o.bearingDeg); // (iv) angle is sacred
          expect(o.dir.x, `seed ${seed}: ${o.id} bearing drift`).toBeCloseTo(v.x, 9);
          expect(o.dir.y, `seed ${seed}: ${o.id} bearing drift`).toBeCloseTo(v.y, 9);
          expect(o.radius).toBeGreaterThanOrEqual(cfg.minRadius - 1e-6);
          expect(o.radius).toBeLessThanOrEqual(cfg.maxRadius + 1e-6);
        }
      }
    });
  });
});

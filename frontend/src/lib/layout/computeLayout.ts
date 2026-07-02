import type { Computed } from "../types";
import { bearingToVec } from "../geo/projection";
import { rectsOverlap } from "./aabb";
import { conflictComponents, scanConflicts, UnionFind } from "./conflicts";
import { seedRadii } from "./radii";
import { restBox } from "./rest";
import { lastResortColumns, placeColumn, tryInPlacePack } from "./resolveGroup";
import type {
  LabelSize,
  LaidOut,
  LayoutConfig,
  LayoutDiagnostics,
  MeasureFn,
} from "./types";
import { verifyLayout } from "./verify";

/**
 * Place arrows at their true bearings and resolve label collisions.
 *
 * The bearing angle is sacred: each arrow's direction (`dir`) is never altered;
 * only its length and its label box move. The engine is constructive and fully
 * deterministic — no force relaxation:
 *
 * 1. Seed arrow lengths: distance-scaled (proportional log map), capped at the
 *    radius where the rest-position label still fits the safe rect ("shorten
 *    the arrow, never clamp the label"), then staggered along same-direction
 *    clusters.
 * 2. Rest placement: every label at its tip (icon just past the arrowhead,
 *    text flowing outward) — in-bounds by construction.
 * 3. Conflict fixpoint: build conflict groups (connected components over box
 *    overlaps + box-vs-spoke hits), resolve each group — in-place vertical
 *    pack first (labels stay at their tips, sliding minimally in tip order,
 *    splitting the difference), outward ordered column otherwise — then rescan;
 *    new cross-group conflicts merge groups and re-resolve. Group count strictly
 *    decreases, so the loop terminates.
 * 4. A provable last resort (two flush margin columns) covers genuinely
 *    over-dense posters.
 *
 * Pass a `LayoutDiagnostics` object as `diag` to capture rest centers, pass
 * count, convergence, and residual defects (used by the tuning lab).
 */
export function computeLayout(
  items: Computed[],
  cfg: LayoutConfig,
  measure: MeasureFn,
  diag?: LayoutDiagnostics,
): LaidOut[] {
  if (items.length === 0) return [];

  const sizes = new Map<string, LabelSize>();
  const laid: LaidOut[] = items.map((p) => {
    const size = measure(p);
    sizes.set(p.id, size);
    const dir = bearingToVec(p.bearingDeg);
    return {
      ...p,
      dir,
      radius: 0,
      perp: 0,
      tip: { x: 0, y: 0 },
      labelBox: { x: 0, y: 0, w: size.w, h: size.h, anchor: "middle" as const, anchorX: 0, anchorY: 0 },
      needsLeader: false,
    };
  });

  const placeRest = (l: LaidOut): void => {
    l.tip = { x: cfg.cx + l.dir.x * l.radius, y: cfg.cy + l.dir.y * l.radius };
    l.labelBox = restBox(l.dir, l.radius, sizes.get(l.id)!, cfg);
  };

  // 1 + 2 — seed, stagger, rest placement.
  const seeds = seedRadii(
    laid.map((l) => ({
      id: l.id,
      bearingDeg: l.bearingDeg,
      distanceKm: l.distanceKm,
      dir: l.dir,
      size: sizes.get(l.id)!,
    })),
    cfg,
  );
  for (const l of laid) {
    l.radius = seeds.get(l.id)!.radius;
    placeRest(l);
  }
  if (diag) {
    for (const l of laid) {
      diag.restCenters[l.id] = {
        x: l.labelBox.x + l.labelBox.w / 2,
        y: l.labelBox.y + l.labelBox.h / 2,
      };
    }
  }

  // 3 — conflict fixpoint.
  const n = laid.length;
  const uf = new UnionFind(n);
  // Items that have been through the column strategy — once a component holds
  // one, re-resolves go straight to the column (mixed re-packing is meaningless).
  const wasColumn = new Array<boolean>(n).fill(false);
  let anyGroup = false;
  let anyColumn = false;
  let converged = false;
  let passes = 0;
  let prevSig = "";

  for (; passes < cfg.maxIters; passes++) {
    const scan = scanConflicts(laid, cfg, uf);
    if (scan.conflicted.size === 0) {
      converged = true;
      break;
    }
    anyGroup = true;
    const comps = conflictComponents(n, uf, scan.conflicted);
    const roots = [...comps.keys()].sort((a, b) => a - b);
    // Stuck on the exact same conflict picture with no merge → stop; the final
    // verification below routes to the last resort.
    const sig = roots.map((r) => `${r}:${comps.get(r)!.join(".")}`).join("|");
    if (!scan.merged && sig === prevSig) break;
    prevSig = sig;

    for (const root of roots) {
      const members = comps.get(root)!;
      // The shaft-aware in-place pack can clear box-box AND box-on-spoke
      // conflicts (shafts are fixed, so it snaps boxes past them). Flagged
      // singletons (off-page / own-arrow / home) and re-resolves of a column
      // group go straight to the column.
      const needsColumn = members.some((m) => wasColumn[m]) || members.length < 2;
      if (!needsColumn && tryInPlacePack(members, laid, cfg)) continue;
      placeColumn(members, laid, cfg);
      anyColumn = true;
      for (const m of members) wasColumn[m] = true;
    }
  }

  // 4 — provable last resort if anything still violates a hard invariant.
  if (verifyLayout(laid, cfg).length > 0) {
    lastResortColumns(laid, cfg);
    anyColumn = true;
    converged = verifyLayout(laid, cfg).length === 0;
  }

  // Finalize: leader attach point (box point nearest the tip — the icon side)
  // and whether the label drifted far enough from its ideal to earn a leader.
  for (const l of laid) {
    const b = l.labelBox;
    b.anchorX = Math.min(Math.max(l.tip.x, b.x), b.x + b.w);
    b.anchorY = Math.min(Math.max(l.tip.y, b.y), b.y + b.h);
    const ideal = restBox(l.dir, l.radius, sizes.get(l.id)!, cfg);
    const dx = b.x + b.w / 2 - (ideal.x + ideal.w / 2);
    const dy = b.y + b.h / 2 - (ideal.y + ideal.h / 2);
    l.needsLeader = Math.hypot(dx, dy) > cfg.leaderThreshold;
  }

  if (diag) {
    diag.iterations = passes;
    diag.converged = converged;
    diag.primaryResolved = !anyGroup;
    diag.fallbackUsed = anyColumn;
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        if (rectsOverlap(laid[i].labelBox, laid[j].labelBox, cfg.boxPadding)) {
          diag.overlapPairs.push([laid[i].id, laid[j].id]);
        }
      }
      const b = laid[i].labelBox;
      const off =
        b.x < cfg.margin - 1e-6 ||
        b.y < cfg.margin - 1e-6 ||
        b.x + b.w > cfg.width - cfg.margin + 1e-6 ||
        b.y + b.h > cfg.safeBottom + 1e-6;
      if (off) diag.offPage.push(laid[i].id);
    }
  }

  return laid;
}

/**
 * Convenience wrapper for the tuning lab: runs `computeLayout` with a fresh
 * `LayoutDiagnostics` and returns both the layout and the diagnostics.
 */
export function computeLayoutWithDiagnostics(
  items: Computed[],
  cfg: LayoutConfig,
  measure: MeasureFn,
): { items: LaidOut[]; diagnostics: LayoutDiagnostics } {
  const diagnostics: LayoutDiagnostics = {
    iterations: 0,
    converged: false,
    primaryResolved: false,
    fallbackUsed: false,
    restCenters: {},
    overlapPairs: [],
    offPage: [],
  };
  const out = computeLayout(items, cfg, measure, diagnostics);
  return { items: out, diagnostics };
}

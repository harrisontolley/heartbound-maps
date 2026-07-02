import { rectsOverlap, segIntersectsRect } from "./aabb";
import type { LaidOut, LayoutConfig } from "./types";
import { hitsHomeDisc, inSafeRect, ownArrowHit } from "./verify";

/** Minimal union-find over item indices, deterministic (smaller root wins). */
export class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  /** Returns true if the union actually merged two distinct components. */
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    const lo = Math.min(ra, rb);
    const hi = Math.max(ra, rb);
    this.parent[hi] = lo;
    return true;
  }
}

export type ConflictScan = {
  /** Did this scan union two previously-separate components? */
  merged: boolean;
  /** Indices newly implicated in any conflict this scan. */
  conflicted: Set<number>;
  /** Component roots that involve a spoke/own-arrow/off-page/home conflict
   * (these need the column strategy — vertical re-packing alone can't fix them). */
  spokeRoots: Set<number>;
};

/**
 * Scan the current placement for every hard-invariant violation and union the
 * participants into conflict components:
 *  - label-box pairs overlapping at `boxPadding`
 *  - a box sitting on another arrow's spoke (at `lineClearance`) — unions the
 *    box with that arrow's place, so cross-sector conflicts merge groups
 *  - unary defects (own-arrow hit, off-page, home-disc) flag the item itself.
 */
export function scanConflicts(
  laid: LaidOut[],
  cfg: LayoutConfig,
  uf: UnionFind,
): ConflictScan {
  const center = { x: cfg.cx, y: cfg.cy };
  const n = laid.length;
  let merged = false;
  const conflicted = new Set<number>();
  const spoke = new Set<number>(); // item indices in spoke-ish conflicts

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rectsOverlap(laid[i].labelBox, laid[j].labelBox, cfg.boxPadding)) {
        merged = uf.union(i, j) || merged;
        conflicted.add(i).add(j);
      }
    }
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      if (segIntersectsRect(center, laid[j].tip, laid[i].labelBox, cfg.lineClearance)) {
        merged = uf.union(i, j) || merged;
        conflicted.add(i).add(j);
        spoke.add(i).add(j);
      }
    }
    if (
      ownArrowHit(laid[i], center) ||
      !inSafeRect(laid[i].labelBox, cfg) ||
      hitsHomeDisc(laid[i].labelBox, center, cfg.homeRadius)
    ) {
      conflicted.add(i);
      spoke.add(i);
    }
  }

  const spokeRoots = new Set<number>();
  for (const i of spoke) spokeRoots.add(uf.find(i));
  return { merged, conflicted, spokeRoots };
}

/** Materialize the components (index lists, ascending) that contain any
 * conflicted member, keyed by root. */
export function conflictComponents(
  n: number,
  uf: UnionFind,
  conflicted: Set<number>,
): Map<number, number[]> {
  const byRoot = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(i);
  }
  const out = new Map<number, number[]>();
  for (const [root, members] of byRoot) {
    if (members.some((m) => conflicted.has(m))) out.set(root, members);
  }
  return out;
}

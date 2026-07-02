import type { Vec2 } from "../geo/projection";
import type { LabelBox, LabelSize, LayoutConfig, TextAnchor } from "./types";

/**
 * Rest placement: where a label ideally sits — the affiliation icon just past
 * the arrowhead, name + distance flowing *away* from the poster center.
 *
 * This module is the single source of truth for that geometry: `restBox` places
 * the box, and `fitRadius` inverts it (the longest arrow whose rest box still
 * fits the content-safe rect). Both must stay in lockstep — the engine seeds
 * every radius at `min(distanceRadius, fitRadius)` so rest boxes are in-bounds
 * *by construction* and no inward clamp ever drags text back onto the shaft.
 */

/** Horizontal clearance kept between the tip and a side-anchored box, so a
 * steep (near-vertical) arrow's shaft never grazes the text below/above it. */
const TIP_SIDE_CLEAR = 8;

export function anchorFor(dir: Vec2, cfg: LayoutConfig): TextAnchor {
  return dir.x > cfg.anchorDeadzone ? "start" : dir.x < -cfg.anchorDeadzone ? "end" : "middle";
}

/**
 * The rest-position label box for an arrow of length `radius`. Pure — no
 * clamping. The box is affine in `radius`: `restBox(dir, r) = restBox(dir, 0)
 * + r·dir` (both x and y translate along the arrow direction), which is what
 * lets `fitRadius` solve for the exact fit bound.
 *
 * - `start`/`end` (side anchors): the box's inner edge sits `gap` past the tip
 *   along the arrow (never closer than TIP_SIDE_CLEAR horizontally), vertically
 *   centered on the gap-offset point — the icon (drawn at the inner edge) marks
 *   the tip.
 * - `middle` (near-vertical): the box sits *entirely beyond* the tip — bottom
 *   edge `gap` above a north tip, top edge `gap` below a south tip — never
 *   straddling the arrowhead.
 */
export function restBox(
  dir: Vec2,
  radius: number,
  size: LabelSize,
  cfg: LayoutConfig,
): LabelBox {
  const { w, h } = size;
  const gap = cfg.iconAtTip ? cfg.tipIconGap : cfg.labelGap;
  const tipX = cfg.cx + dir.x * radius;
  const tipY = cfg.cy + dir.y * radius;
  const anchor = anchorFor(dir, cfg);

  let x: number;
  let y: number;
  if (anchor === "start") {
    x = tipX + Math.max(dir.x * gap, TIP_SIDE_CLEAR);
    y = tipY + dir.y * gap - h / 2;
  } else if (anchor === "end") {
    x = tipX + Math.min(dir.x * gap, -TIP_SIDE_CLEAR) - w;
    y = tipY + dir.y * gap - h / 2;
  } else {
    x = tipX + dir.x * gap - w / 2;
    // Entirely beyond the tip: above a north-pointing arrow, below a south one.
    y = dir.y < 0 ? tipY - gap - h : tipY + gap;
  }

  // Provisional attach point (the box point nearest the tip — the icon side);
  // `finalize` recomputes it after collision resolution.
  const anchorX = Math.min(Math.max(tipX, x), x + w);
  const anchorY = Math.min(Math.max(tipY, y), y + h);
  return { x, y, w, h, anchor, anchorX, anchorY };
}

/**
 * The largest arrow radius whose rest box fits entirely inside the content-safe
 * rect. Because the rest box is affine in `radius` (see `restBox`), each safe
 * edge yields one linear bound; the fit radius is their minimum. `Infinity`
 * when no edge binds; can be negative for a label genuinely too large to fit
 * (the caller floors it).
 */
export function fitRadius(dir: Vec2, size: LabelSize, cfg: LayoutConfig): number {
  const b0 = restBox(dir, 0, size, cfg);
  const eps = 1e-9;
  let ub = Infinity;
  if (dir.x > eps) ub = Math.min(ub, (cfg.width - cfg.margin - size.w - b0.x) / dir.x);
  else if (dir.x < -eps) ub = Math.min(ub, (cfg.margin - b0.x) / dir.x);
  if (dir.y > eps) ub = Math.min(ub, (cfg.safeBottom - size.h - b0.y) / dir.y);
  else if (dir.y < -eps) ub = Math.min(ub, (cfg.margin - b0.y) / dir.y);
  return ub;
}

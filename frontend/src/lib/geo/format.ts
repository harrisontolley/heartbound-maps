import type { Units } from "../types";

const MI_PER_KM = 0.621371;

/**
 * Format a distance for a poster label. Distances ≥ 1000 are rounded to the
 * nearest 10 and grouped with thousands separators; smaller ones round to the
 * nearest unit. Locale pinned to en-US so output is deterministic everywhere
 * (live preview, SVG/PNG export, and tests).
 */
export function fmtDistance(km: number, units: Units): string {
  const v = units === "mi" ? km * MI_PER_KM : km;
  const rounded = v >= 1000 ? Math.round(v / 10) * 10 : Math.round(v);
  return `${rounded.toLocaleString("en-US")} ${units}`;
}

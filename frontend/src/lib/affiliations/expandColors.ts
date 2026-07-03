import type { Affiliation } from "../types";

/**
 * Derives the full 8-affiliation color map from a template's four hand-tuned
 * core colors (born/lived/visited/family). Each derived color is a small HSL
 * transform OF THAT TEMPLATE'S OWN color, so it inherits the template's
 * harmony instead of needing 4 more hand-picked values per template:
 *
 *   married   <- family   (hue toward rose, a touch lighter)
 *   met       <- visited  (hue toward violet, slightly desaturated)
 *   studied   <- born     (darker, more muted — gold -> bronze)
 *   adventure <- lived    (hue toward teal)
 *
 * Templates with restricted palettes (achromatic, monochrome, dark-ground)
 * should hand out `overrides` instead — hue-shifting a gray is a no-op.
 */

type CoreColors = {
  born: string;
  lived: string;
  visited: string;
  family: string;
};

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v + m)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function shift(
  hex: string,
  d: { h?: number; s?: number; l?: number },
): string {
  const hsl = hexToHsl(hex);
  return hslToHex({
    h: hsl.h + (d.h ?? 0),
    s: Math.max(0.04, Math.min(1, hsl.s + (d.s ?? 0))),
    l: Math.max(0.08, Math.min(0.92, hsl.l + (d.l ?? 0))),
  });
}

export function expandAffiliationColors(
  core: CoreColors,
  overrides?: Partial<Record<Affiliation, string>>,
): Record<Affiliation, string> {
  return {
    born: core.born,
    lived: core.lived,
    visited: core.visited,
    family: core.family,
    married: shift(core.family, { h: 14, l: 0.04 }),
    met: shift(core.visited, { h: 28, s: -0.04 }),
    studied: shift(core.born, { l: -0.1, s: -0.12 }),
    adventure: shift(core.lived, { h: 35 }),
    ...overrides,
  };
}

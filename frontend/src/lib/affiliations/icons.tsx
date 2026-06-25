import type { ReactNode } from "react";
import type { Affiliation } from "../types";

// Vector glyphs in a 24×24 box, filled with the current color. One per tie type:
// Born = star, Lived = house, Visited = map pin, Family = heart.
export const AFFILIATION_GLYPHS: Record<Affiliation, ReactNode> = {
  born: (
    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  ),
  lived: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  visited: (
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
  ),
  family: (
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
  ),
};

/** Affiliation glyph for the poster SVG, centered on (x, y) at the given size. */
export function PosterGlyph({
  type,
  x,
  y,
  size,
  color,
  opacity = 1,
}: {
  type: Affiliation;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity?: number;
}) {
  const s = size / 24;
  return (
    <g
      transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${s})`}
      fill={color}
      opacity={opacity}
    >
      {AFFILIATION_GLYPHS[type]}
    </g>
  );
}

/** Standalone affiliation icon for the controls UI. */
export function AffiliationIcon({
  type,
  size = 16,
  color = "currentColor",
  className,
}: {
  type: Affiliation;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={className}
      aria-hidden="true"
    >
      {AFFILIATION_GLYPHS[type]}
    </svg>
  );
}

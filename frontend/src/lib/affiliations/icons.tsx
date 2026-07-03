import type { ReactNode } from "react";
import type { Affiliation } from "../types";

/**
 * Vector glyphs in a 24×24 box, drawn as thin-stroke line art (fine hairline
 * marks that sit with the fine-art positioning, not filled app icons). Every
 * glyph is pure stroke paths — fill/stroke are inherited from the wrapping
 * group, which keeps the resvg print path happy (no currentColor, no CSS).
 *
 * Born = star · Lived = house · Studied = mortarboard · Met = speech bubble ·
 * Married = interlocked rings · Family = heart · Visited = map pin ·
 * Adventure = mountain peaks.
 */
export const AFFILIATION_GLYPHS: Record<Affiliation, ReactNode> = {
  born: (
    <path d="M12 3l2.5 5.4 5.9.6-4.4 4 1.2 5.8L12 15.9l-5.2 2.9 1.2-5.8-4.4-4 5.9-.6z" />
  ),
  lived: (
    <>
      <path d="M4.2 11.6L12 4.6l7.8 7" />
      <path d="M6.4 10.4v9.1h11.2v-9.1" />
      <path d="M10 19.5v-4.6h4v4.6" />
    </>
  ),
  studied: (
    <>
      <path d="M2.6 9.6L12 5.2l9.4 4.4L12 14z" />
      <path d="M6.6 11.8v4.2c0 1.3 2.4 2.6 5.4 2.6s5.4-1.3 5.4-2.6v-4.2" />
      <path d="M21.4 9.6v4.9" />
    </>
  ),
  met: (
    <path d="M4.5 4.6h15a1.6 1.6 0 0 1 1.6 1.6v8.6a1.6 1.6 0 0 1-1.6 1.6h-4.3L12 20.2l-3.2-3.8H4.5a1.6 1.6 0 0 1-1.6-1.6V6.2a1.6 1.6 0 0 1 1.6-1.6z" />
  ),
  married: (
    <>
      <circle cx="9" cy="13.2" r="5.6" />
      <circle cx="15" cy="13.2" r="5.6" />
      <path d="M12 5.4l-1.7-2.3h3.4z" />
    </>
  ),
  family: (
    <path d="M12 20.1L5.3 14C3.8 12.6 3 11 3 9.4 3 6.5 5.2 4.5 7.7 4.5c1.7 0 3.2.8 4.3 2.2 1.1-1.4 2.6-2.2 4.3-2.2 2.5 0 4.7 2 4.7 4.9 0 1.6-.8 3.2-2.3 4.6z" />
  ),
  visited: (
    <>
      <path d="M12 21.4S5.6 14.4 5.6 9.5a6.4 6.4 0 0 1 12.8 0c0 4.9-6.4 11.9-6.4 11.9z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </>
  ),
  adventure: (
    <path d="M2.7 19.4L8.6 8.6l3.7 6.5 2.8-5.3 6.2 9.6z" />
  ),
};

const STROKE_W = 1.75;

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
      fill="none"
      stroke={color}
      strokeWidth={STROKE_W}
      strokeLinecap="round"
      strokeLinejoin="round"
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
      fill="none"
      stroke={color}
      strokeWidth={STROKE_W * 1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {AFFILIATION_GLYPHS[type]}
    </svg>
  );
}

// Shared poster framing. Both the SVG renderer (Poster.tsx) and the layout
// engine (layout/config.ts) derive the compass center + collision safe-area from
// here, so they always agree. The drawing area is the region above a reserved
// bottom band (the title / legend / footer block); the compass is centered low
// on tall posters (the classic look) and lifted just enough on short/landscape
// ones so arrows + labels never collide with that block. Geometry stays sacred —
// arrows are unit-vector spokes from (cx, cy); only their length is bounded here.

/** Layout margin (matches the old defaultLayoutConfig margin). */
export const POSTER_MARGIN = 80;
/** Half the height of a typical two-line label — reserved inside the safe area. */
export const EST_LABEL_HALF = 90;
/** Vertical space reserved at the bottom for the title / coords / legend / footer. */
export const BOTTOM_BAND = 390;
/** Smallest compass radius we'll allow before lifting the center on short posters. */
export const MIN_DRAW_RADIUS = 140;

export type PosterGeometry = {
  cx: number;
  cy: number;
  /** Max arrow length so tips + label overhang stay inside the safe area. */
  maxRadius: number;
};

export function posterGeometry(width: number, height: number): PosterGeometry {
  const cx = width / 2;
  const bandTop = height - BOTTOM_BAND;
  // Classic low center (0.46·h), but never so low the safe area can't clear the
  // bottom block on short posters.
  const cap = bandTop - EST_LABEL_HALF - MIN_DRAW_RADIUS;
  const cy = Math.min(height * 0.46, cap);
  const maxRadius = Math.min(
    cx - POSTER_MARGIN, // left / right reach
    cy - POSTER_MARGIN - EST_LABEL_HALF, // upward (top label clears the margin)
    bandTop - EST_LABEL_HALF - cy, // downward (bottom label clears the text block)
  );
  return { cx, cy, maxRadius };
}

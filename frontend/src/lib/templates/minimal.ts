import type { TemplateSpec } from "./types";
import { expandAffiliationColors } from "@/lib/affiliations/expandColors";

/**
 * Minimal compass — chalk background, the finest ebony hairline arrows, maximal
 * negative space, airy uppercase letter-spaced sans labels, a faint guide ring.
 * The cool/neutral monoline counterpart to the warm-serif Warm Minimal;
 * affiliation shows as a small muted glyph rather than loud color.
 */
export const minimal: TemplateSpec = {
  id: "minimal-compass",
  name: "Minimal Compass",
  blurb: "Chalk field, ebony hairlines, generous space.",

  paper: "#f6f4ef",
  paperEdge: null,
  ink: "#1f1d1b",
  inkSoft: "#a39c91",
  accent: "#1f1d1b",
  border: null,

  rose: "tick",
  texture: false,
  doubleBorder: false,
  ringGuides: false,
  homeGlow: false,

  titleFamily: "var(--font-inter)",
  nameFamily: "var(--font-inter)",
  distFamily: "var(--font-inter)",

  titleWeight: 600,
  titleLetterSpacing: 12,
  nameTransform: "uppercase",
  nameWeight: 500,
  nameLetterSpacing: 3.5,
  distItalic: false,
  distLetterSpacing: 1.5,

  titleSize: 60,
  subtitleSize: 19,
  nameSize: 22,
  distSize: 15,
  lineHeight: 26,
  arrowWidth: 1.2,
  arrowhead: "line",
  arrowheadSize: 11,
  homeDotSize: 6,
  iconSize: 16,

  affiliationColors: expandAffiliationColors({
    born: "#b08a4a",
    lived: "#5f8068",
    visited: "#5a7794",
    family: "#b06a62",
  }),
  colorizeArrows: false,
  glyphOpacity: 0.8,
};

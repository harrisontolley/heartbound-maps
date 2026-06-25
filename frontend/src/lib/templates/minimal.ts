import type { TemplateSpec } from "./types";

/**
 * Minimal compass — cream background, thin charcoal arrows, lots of negative
 * space, uppercase letter-spaced sans labels, a tiny "N" tick. Restraint;
 * affiliation shows as a small colored glyph rather than loud color.
 */
export const minimal: TemplateSpec = {
  id: "minimal-compass",
  name: "Minimal Compass",
  blurb: "Cream, hairline arrows, lots of space.",

  paper: "#f7f3ec",
  paperEdge: null,
  ink: "#2b2b2b",
  inkSoft: "#9a958c",
  accent: "#2b2b2b",
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
  titleLetterSpacing: 10,
  nameTransform: "uppercase",
  nameWeight: 600,
  nameLetterSpacing: 3,
  distItalic: false,
  distLetterSpacing: 1.5,

  titleSize: 62,
  subtitleSize: 19,
  nameSize: 22,
  distSize: 15,
  lineHeight: 26,
  arrowWidth: 1.5,
  arrowhead: "line",
  arrowheadSize: 12,
  homeDotSize: 7,
  iconSize: 17,

  affiliationColors: {
    born: "#bb8a33",
    lived: "#3f7d5d",
    visited: "#3a6ea5",
    family: "#c0504e",
  },
  colorizeArrows: false,
  glyphOpacity: 1,
};

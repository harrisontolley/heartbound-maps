import type { TemplateSpec } from "./types";

/**
 * Constellation — a personal star chart. Deep space-blue field, faint guide
 * rings and a starburst, a soft glow at home, and faint lines linking each
 * place into a constellation. Cool starlight palette; serif smallcaps names.
 */
export const constellation: TemplateSpec = {
  id: "constellation",
  name: "Constellation",
  blurb: "Star chart — glowing center, linked stars.",

  paper: "#0a0e1a",
  paperEdge: "#05060d",
  ink: "#eef2ff",
  inkSoft: "#9aa3c4",
  accent: "#cdd7ff",
  border: "#232a44",

  rose: "starburst",
  texture: false,
  doubleBorder: false,
  ringGuides: true,
  homeGlow: true,
  constellationLines: true,

  titleFamily: "var(--font-playfair)",
  nameFamily: "var(--font-garamond)",
  distFamily: "var(--font-garamond)",

  titleWeight: 600,
  titleLetterSpacing: 6,
  nameTransform: "smallcaps",
  nameWeight: 500,
  nameLetterSpacing: 2,
  distItalic: true,
  distLetterSpacing: 1,

  titleSize: 82,
  subtitleSize: 23,
  nameSize: 29,
  distSize: 21,
  lineHeight: 33,
  arrowWidth: 1.3,
  arrowhead: "line",
  arrowheadSize: 13,
  homeDotSize: 10,
  iconSize: 24,

  affiliationColors: {
    born: "#cdd7ff",
    lived: "#9fe0c8",
    visited: "#a9c2ff",
    family: "#e6b8d0",
  },
  colorizeArrows: false,
  glyphOpacity: 0.95,
};

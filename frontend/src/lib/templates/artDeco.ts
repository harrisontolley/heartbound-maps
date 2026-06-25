import type { TemplateSpec } from "./types";

/**
 * Art Deco — 1920s Grand-Tour glamour. Near-black field, gold rules and a
 * symmetrical stepped sunburst, cream high-contrast display type, and stepped
 * corner ornaments. Affiliation shows as gold + jewel tones.
 */
export const artDeco: TemplateSpec = {
  id: "art-deco",
  name: "Art Deco",
  blurb: "Black & gold, sunburst, stepped corners.",

  paper: "#11100e",
  paperEdge: "#1c1a16",
  ink: "#f3e9d2",
  inkSoft: "#c8a85f",
  accent: "#c9a227",
  border: "#c9a227",

  rose: "deco",
  texture: false,
  doubleBorder: true,
  ringGuides: false,
  homeGlow: false,
  cornerOrnament: "deco",

  titleFamily: "var(--font-playfair)",
  nameFamily: "var(--font-archivo)",
  distFamily: "var(--font-garamond)",

  titleWeight: 700,
  titleLetterSpacing: 8,
  nameTransform: "uppercase",
  nameWeight: 600,
  nameLetterSpacing: 4,
  distItalic: true,
  distLetterSpacing: 2,

  titleSize: 84,
  subtitleSize: 22,
  nameSize: 26,
  distSize: 19,
  lineHeight: 32,
  arrowWidth: 1.4,
  arrowhead: "line",
  arrowheadSize: 16,
  homeDotSize: 9,
  iconSize: 23,

  affiliationColors: {
    born: "#c9a227",
    lived: "#2e7d5b",
    visited: "#2f5d8a",
    family: "#9e3b3b",
  },
  colorizeArrows: false,
  glyphOpacity: 0.95,
};

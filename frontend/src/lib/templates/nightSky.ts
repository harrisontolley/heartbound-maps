import type { TemplateSpec } from "./types";

/**
 * Night sky — dark navy field, faint concentric rings, a glowing center point,
 * thin light arrows, off-white serif names with gold accents. The gift /
 * emotional positioning; affiliation shows as luminous gold-family tints.
 */
export const nightSky: TemplateSpec = {
  id: "night-sky",
  name: "Night Sky",
  blurb: "Navy field, glowing center, golden labels.",

  paper: "#0b1026",
  paperEdge: "#05070f",
  ink: "#ede8d6",
  inkSoft: "#a9a07f",
  accent: "#e8c66b",
  border: "#2a3050",

  rose: "starburst",
  texture: false,
  doubleBorder: false,
  ringGuides: true,
  homeGlow: true,

  titleFamily: "var(--font-playfair)",
  nameFamily: "var(--font-garamond)",
  distFamily: "var(--font-garamond)",

  titleWeight: 600,
  titleLetterSpacing: 5,
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
  arrowWidth: 1.5,
  arrowhead: "line",
  arrowheadSize: 14,
  homeDotSize: 11,
  iconSize: 25,

  affiliationColors: {
    born: "#e8c66b",
    lived: "#8fc0a0",
    visited: "#8fb3d9",
    family: "#d9919e",
  },
  colorizeArrows: false,
  glyphOpacity: 0.95,
};

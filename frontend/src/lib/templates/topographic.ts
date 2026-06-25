import type { TemplateSpec } from "./types";

/**
 * Topographic — an outdoors contour map. Warm sand paper with layered contour
 * rings radiating from home as distance bands, mossy ink, clay accents and a
 * subtle grain. Affiliation color is earthy and tints the arrows.
 */
export const topographic: TemplateSpec = {
  id: "topographic",
  name: "Topographic",
  blurb: "Contour rings, earthy tones, field-map feel.",

  paper: "#ece4d2",
  paperEdge: "#d8cab0",
  ink: "#3b4a2f",
  inkSoft: "#6f7a55",
  accent: "#b5622e",
  border: "#7a7351",

  rose: "none",
  texture: true,
  doubleBorder: false,
  ringGuides: false,
  homeGlow: false,
  backdrop: "contours",

  titleFamily: "var(--font-archivo)",
  nameFamily: "var(--font-inter)",
  distFamily: "var(--font-inter)",

  titleWeight: 800,
  titleLetterSpacing: 1,
  nameTransform: "uppercase",
  nameWeight: 600,
  nameLetterSpacing: 1.5,
  distItalic: false,
  distLetterSpacing: 1,

  titleSize: 76,
  subtitleSize: 20,
  nameSize: 23,
  distSize: 16,
  lineHeight: 27,
  arrowWidth: 2,
  arrowhead: "line",
  arrowheadSize: 14,
  homeDotSize: 9,
  iconSize: 20,

  affiliationColors: {
    born: "#b5622e",
    lived: "#5c7a3a",
    visited: "#3f6f72",
    family: "#8a3b2e",
  },
  colorizeArrows: true,
  glyphOpacity: 1,
};

import type { TemplateSpec } from "./types";
import { expandAffiliationColors } from "@/lib/affiliations/expandColors";

/**
 * Topographic — a contour-relief field map. Warm sand paper with layered
 * umber contour rings radiating from home as elevation bands, deep umber ink,
 * burnt-sienna accents and a subtle grain. Clean Inter labels sit over the
 * relief; affiliation color is earthy and tints the arrows.
 */
export const topographic: TemplateSpec = {
  id: "topographic",
  name: "Topographic",
  blurb: "Umber contour relief, earthy bands, bold labels.",

  paper: "#e9e0cd",
  paperEdge: "#d3c4a6",
  ink: "#43382a",
  inkSoft: "#8a7a5f",
  accent: "#b5622e",
  border: "#8a7a5f",

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

  affiliationColors: expandAffiliationColors({
    born: "#b5622e",
    lived: "#6f7a3f",
    visited: "#3f6f72",
    family: "#8a4a2e",
  }),
  colorizeArrows: true,
  glyphOpacity: 1,
};

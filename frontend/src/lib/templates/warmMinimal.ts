import type { TemplateSpec } from "./types";
import { expandAffiliationColors } from "@/lib/affiliations/expandColors";

/**
 * Warm Minimal — the Japandi flagship. Warm oat paper, soft warm charcoal, a
 * single muted-clay accent, generous negative space and airy wide-tracked sans
 * labels under a warm optical serif title. No border, no texture — restraint
 * with warmth rather than the clinical black-on-white of older minimal looks.
 */
export const warmMinimal: TemplateSpec = {
  id: "warm-minimal",
  name: "Warm Minimal",
  blurb: "Warm oat, clay accent, airy negative space.",

  paper: "#efe7da",
  paperEdge: null,
  ink: "#3a352e",
  inkSoft: "#9a9082",
  accent: "#a8754f",
  border: null,

  rose: "tick",
  texture: false,
  doubleBorder: false,
  ringGuides: false,
  homeGlow: false,

  titleFamily: "var(--font-fraunces)",
  nameFamily: "var(--font-inter)",
  distFamily: "var(--font-inter)",

  titleWeight: 400,
  titleLetterSpacing: 1,
  nameTransform: "uppercase",
  nameWeight: 500,
  nameLetterSpacing: 3.5,
  distItalic: false,
  distLetterSpacing: 1.5,

  titleSize: 68,
  subtitleSize: 19,
  nameSize: 21,
  distSize: 14,
  lineHeight: 26,
  arrowWidth: 1.3,
  arrowhead: "line",
  arrowheadSize: 11,
  homeDotSize: 6,
  iconSize: 16,

  affiliationColors: expandAffiliationColors({
    born: "#b08741",
    lived: "#7a8266",
    visited: "#6e7f86",
    family: "#a86a55",
  }),
  colorizeArrows: false,
  glyphOpacity: 0.9,
};

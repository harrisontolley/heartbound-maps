import type { TemplateSpec } from "./types";
import { expandAffiliationColors } from "@/lib/affiliations/expandColors";

/**
 * Celestial — a refined night-sky. Deep warm indigo (less black than the older
 * night-sky), a glowing home point, dotted guide rings, and a muted-gold accent.
 * A warm optical serif title over small-caps serif names with italic distances —
 * the calm, modern take on the trending celestial decor category.
 */
export const celestial: TemplateSpec = {
  id: "celestial",
  name: "Celestial",
  blurb: "Deep indigo, glowing center, muted gold.",

  paper: "#13182b",
  paperEdge: "#0c0f1d",
  ink: "#ede6d4",
  inkSoft: "#a9a48f",
  accent: "#e0b35c",
  border: null,

  rose: "starburst",
  texture: false,
  doubleBorder: false,
  ringGuides: true,
  homeGlow: true,

  titleFamily: "var(--font-fraunces)",
  nameFamily: "var(--font-garamond)",
  distFamily: "var(--font-garamond)",

  titleWeight: 500,
  titleLetterSpacing: 4,
  nameTransform: "smallcaps",
  nameWeight: 500,
  nameLetterSpacing: 2.5,
  distItalic: true,
  distLetterSpacing: 1,

  titleSize: 76,
  subtitleSize: 20,
  nameSize: 26,
  distSize: 18,
  lineHeight: 30,
  arrowWidth: 1.2,
  arrowhead: "line",
  arrowheadSize: 12,
  homeDotSize: 8,
  iconSize: 18,

  affiliationColors: expandAffiliationColors({
    born: "#e0b35c",
    lived: "#8fae9b",
    visited: "#9bb0d6",
    family: "#cf8f7a",
  }),
  colorizeArrows: false,
  glyphOpacity: 0.85,
};

import type { TemplateSpec } from "./types";
import { expandAffiliationColors } from "@/lib/affiliations/expandColors";

/**
 * Bold modern — a 2026 gallery-poster. Warm off-white field, thick arrows with
 * solid triangular heads tinted by a curated warm-forward palette, heavy
 * geometric sans (Archivo) as the focal point, large high-contrast labels.
 * Affiliation color is loud and front-and-center.
 */
export const bold: TemplateSpec = {
  id: "bold-modern",
  name: "Bold Modern",
  blurb: "Warm off-white, heavy grotesque, vibrant arrows.",

  paper: "#f7f4ee",
  paperEdge: null,
  ink: "#1a1714",
  inkSoft: "#6b645c",
  accent: "#c8502a",
  border: null,

  rose: "none",
  texture: false,
  doubleBorder: false,
  ringGuides: false,
  homeGlow: false,

  titleFamily: "var(--font-archivo)",
  nameFamily: "var(--font-archivo)",
  distFamily: "var(--font-archivo)",

  titleWeight: 900,
  titleLetterSpacing: -1.5,
  nameTransform: "uppercase",
  nameWeight: 800,
  nameLetterSpacing: 0.5,
  distItalic: false,
  distLetterSpacing: 0.5,

  titleSize: 100,
  subtitleSize: 22,
  nameSize: 27,
  distSize: 18,
  lineHeight: 31,
  arrowWidth: 5,
  arrowhead: "solid",
  arrowheadSize: 27,
  homeDotSize: 15,
  iconSize: 22,

  affiliationColors: expandAffiliationColors({
    born: "#e0922a",
    lived: "#4f8a6a",
    visited: "#2d7d8f",
    family: "#c8502a",
  }),
  colorizeArrows: true,
  glyphOpacity: 1,
};

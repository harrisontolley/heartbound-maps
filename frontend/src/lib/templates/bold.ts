import type { TemplateSpec } from "./types";

/**
 * Bold modern — white field, thick arrows with solid triangular heads tinted by
 * affiliation, heavy geometric sans (Archivo), large high-contrast labels. The
 * graphic-poster look; affiliation color is loud and front-and-center.
 */
export const bold: TemplateSpec = {
  id: "bold-modern",
  name: "Bold Modern",
  blurb: "Thick arrows, vivid color, heavy sans.",

  paper: "#ffffff",
  paperEdge: null,
  ink: "#111111",
  inkSoft: "#6b6b6b",
  accent: "#e4572e",
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
  titleLetterSpacing: -1,
  nameTransform: "uppercase",
  nameWeight: 800,
  nameLetterSpacing: 0.5,
  distItalic: false,
  distLetterSpacing: 0.5,

  titleSize: 96,
  subtitleSize: 22,
  nameSize: 27,
  distSize: 18,
  lineHeight: 31,
  arrowWidth: 5,
  arrowhead: "solid",
  arrowheadSize: 27,
  homeDotSize: 15,
  iconSize: 22,

  affiliationColors: {
    born: "#f5a623",
    lived: "#22a06b",
    visited: "#2b7fe4",
    family: "#e4572e",
  },
  colorizeArrows: true,
  glyphOpacity: 1,
};

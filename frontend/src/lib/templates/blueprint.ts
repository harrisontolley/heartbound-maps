import type { TemplateSpec } from "./types";

/**
 * Blueprint — an architect's drafting drawing. Deep blueprint-blue field, a fine
 * cyan grid, hairline arrows, a technical crosshair compass, and monospaced
 * labels. Monochrome by intent; affiliation shows only as subtle cyan tints.
 */
export const blueprint: TemplateSpec = {
  id: "blueprint",
  name: "Blueprint",
  blurb: "Drafting grid, hairlines, mono labels.",

  paper: "#0e3a5f",
  paperEdge: "#0b2f4d",
  ink: "#dbe9f5",
  inkSoft: "#7fa8c9",
  accent: "#9fd0ff",
  border: "#6f9fc4",

  rose: "crosshair",
  texture: false,
  doubleBorder: true,
  ringGuides: false,
  homeGlow: false,
  backdrop: "grid",

  titleFamily: "var(--font-archivo)",
  nameFamily: "var(--font-jetbrains-mono)",
  distFamily: "var(--font-jetbrains-mono)",

  titleWeight: 700,
  titleLetterSpacing: 4,
  nameTransform: "uppercase",
  nameWeight: 500,
  nameLetterSpacing: 1,
  distItalic: false,
  distLetterSpacing: 0.5,

  titleSize: 70,
  subtitleSize: 20,
  nameSize: 22,
  distSize: 16,
  lineHeight: 28,
  arrowWidth: 1.4,
  arrowhead: "line",
  arrowheadSize: 14,
  homeDotSize: 8,
  iconSize: 20,

  affiliationColors: {
    born: "#9fd0ff",
    lived: "#8fe0c0",
    visited: "#cfe6ff",
    family: "#ffd6a0",
  },
  colorizeArrows: false,
  glyphOpacity: 0.9,
};

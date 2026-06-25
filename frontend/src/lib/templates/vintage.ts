import type { TemplateSpec } from "./types";

/**
 * HERO template — aged-paper cartography. Warm paper with a vignette + grain,
 * a decorative compass rose behind the center, serif typography (Playfair +
 * EB Garamond), small-caps place names and italic distances, a double-rule
 * border. The look the demo sells.
 */
export const vintage: TemplateSpec = {
  id: "vintage-cartography",
  name: "Vintage Cartography",
  blurb: "Aged paper, compass rose, engraved serif type.",

  paper: "#ede3cf",
  paperEdge: "#cdb98f",
  ink: "#3a2d18",
  inkSoft: "#7a6543",
  accent: "#6b4f2a",
  border: "#6b5a3e",

  rose: "ornate",
  texture: true,
  doubleBorder: true,
  ringGuides: false,
  homeGlow: false,

  titleFamily: "var(--font-playfair)",
  nameFamily: "var(--font-garamond)",
  distFamily: "var(--font-garamond)",

  titleWeight: 600,
  titleLetterSpacing: 6,
  nameTransform: "smallcaps",
  nameWeight: 500,
  nameLetterSpacing: 2.5,
  distItalic: true,
  distLetterSpacing: 1,

  titleSize: 88,
  subtitleSize: 25,
  nameSize: 31,
  distSize: 23,
  lineHeight: 35,
  arrowWidth: 1.6,
  arrowhead: "line",
  arrowheadSize: 17,
  homeDotSize: 9,
  iconSize: 27,

  affiliationColors: {
    born: "#9c6b1e",
    lived: "#5c6b3a",
    visited: "#42586b",
    family: "#8a3b2e",
  },
  colorizeArrows: false,
  glyphOpacity: 0.92,
};

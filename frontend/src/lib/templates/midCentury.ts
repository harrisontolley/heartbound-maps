import type { TemplateSpec } from "./types";
import { expandAffiliationColors } from "@/lib/affiliations/expandColors";

/**
 * Mid-Century — 70s retro-earth. Warm cream paper, espresso ink, burnt-terracotta
 * accent, thick solid arrows tinted by affiliation across an earthy palette
 * (amber, olive, teal, terracotta). A groovy optical serif title over geometric
 * grotesque labels: the retro travel-poster warmth.
 */
export const midCentury: TemplateSpec = {
  id: "mid-century",
  name: "Mid-Century",
  blurb: "70s earth tones, geometric type, bold arrows.",

  paper: "#e8dcc6",
  paperEdge: null,
  ink: "#33291d",
  inkSoft: "#7c6a4f",
  accent: "#c15c2c",
  border: null,

  rose: "none",
  texture: false,
  doubleBorder: false,
  ringGuides: false,
  homeGlow: false,

  titleFamily: "var(--font-fraunces)",
  nameFamily: "var(--font-space-grotesk)",
  distFamily: "var(--font-space-grotesk)",

  titleWeight: 600,
  titleLetterSpacing: 0,
  nameTransform: "uppercase",
  nameWeight: 600,
  nameLetterSpacing: 1.5,
  distItalic: false,
  distLetterSpacing: 1,

  titleSize: 84,
  subtitleSize: 20,
  nameSize: 24,
  distSize: 16,
  lineHeight: 28,
  arrowWidth: 3,
  arrowhead: "solid",
  arrowheadSize: 20,
  homeDotSize: 11,
  iconSize: 20,

  affiliationColors: expandAffiliationColors({
    born: "#d98a2b",
    lived: "#6f7b3a",
    visited: "#4a7a78",
    family: "#c15c2c",
  }),
  colorizeArrows: true,
  glyphOpacity: 1,
};

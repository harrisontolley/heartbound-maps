import type { TemplateSpec, VintageVariant } from "./types";
import { vintage } from "./vintage";

// Three directions on the hero vintage template. They share the cartography
// geometry + serif typography; palette, border weight, line weight, and the
// affiliation inks differ. The user picks one via an in-app toggle.

// Warm cream, ornate rose, double rule — the default.
const classic: TemplateSpec = { ...vintage, name: "Classic" };

// Deeper field-journal parchment, terracotta accents, a single heavy rule,
// slightly bolder display.
const explorer: TemplateSpec = {
  ...vintage,
  name: "Explorer",
  paper: "#e6d6b4",
  paperEdge: "#a98a52",
  ink: "#3a2b16",
  inkSoft: "#6e5430",
  accent: "#8a4a22",
  border: "#5a4322",
  doubleBorder: false,
  titleSize: 92,
  titleLetterSpacing: 8,
  arrowWidth: 1.9,
  arrowheadSize: 18,
  homeDotSize: 10,
  affiliationColors: {
    born: "#9a5a16",
    lived: "#5e6630",
    visited: "#3f5560",
    family: "#8f3a22",
  },
};

// Cool antique sea-atlas: pale blue-grey paper, ink in slate, fine hairlines.
const atlas: TemplateSpec = {
  ...vintage,
  name: "Sea Atlas",
  paper: "#edf0ea",
  paperEdge: "#c2cabb",
  ink: "#2d3a44",
  inkSoft: "#5c6a72",
  accent: "#39566a",
  border: "#39484f",
  nameLetterSpacing: 3,
  titleSize: 84,
  titleLetterSpacing: 5,
  arrowWidth: 1.3,
  arrowheadSize: 15,
  affiliationColors: {
    born: "#9a7320",
    lived: "#3f6f57",
    visited: "#34607f",
    family: "#a3493f",
  },
};

export const VINTAGE_VARIANTS: Record<VintageVariant, TemplateSpec> = {
  classic,
  explorer,
  atlas,
};

export const VINTAGE_VARIANT_ORDER: VintageVariant[] = [
  "classic",
  "explorer",
  "atlas",
];

export const VINTAGE_VARIANT_LABELS: Record<VintageVariant, string> = {
  classic: "Classic",
  explorer: "Explorer",
  atlas: "Sea Atlas",
};

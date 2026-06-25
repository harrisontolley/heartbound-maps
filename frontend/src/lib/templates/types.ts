import type { Affiliation } from "../types";

export type TemplateId =
  | "vintage-cartography"
  | "minimal-compass"
  | "bold-modern"
  | "night-sky"
  | "blueprint"
  | "art-deco"
  | "topographic"
  | "constellation";

/** Sub-styles of the hero vintage template (chosen via in-app toggle). */
export type VintageVariant = "classic" | "explorer" | "atlas";

export type NameTransform = "uppercase" | "smallcaps" | "none";
export type ArrowheadStyle = "line" | "solid";
export type RoseStyle =
  | "ornate"
  | "tick"
  | "none"
  | "starburst"
  | "crosshair"
  | "deco";
/** Optional full-bleed background motif drawn behind the compass. */
export type BackdropStyle = "grid" | "contours";

/**
 * Everything the SVG poster needs to render one design. All sizes are in poster
 * units (viewBox 1000×1500). Geometry is shared across templates; only these
 * style tokens differ. Both the renderer and the text measurer read this spec,
 * so measured label boxes always match what is drawn.
 */
export type TemplateSpec = {
  id: TemplateId;
  name: string;
  /** One-line description for the template switcher. */
  blurb: string;

  // ---- Palette ----
  paper: string;
  /** Vignette outer color, or null for a flat background. */
  paperEdge: string | null;
  /** Primary lines + place names. */
  ink: string;
  /** Secondary text (distances, footer). */
  inkSoft: string;
  /** Home dot + arrowheads when not colorized by affiliation. */
  accent: string;
  /** Frame color, or null for no border. */
  border: string | null;

  // ---- Decoration ----
  rose: RoseStyle;
  texture: boolean;
  doubleBorder: boolean;
  ringGuides: boolean;
  /** Soft glow behind the home point (night-sky). */
  homeGlow: boolean;
  /** Full-bleed background motif (blueprint grid / topographic contours). */
  backdrop?: BackdropStyle;
  /** Stepped flourishes inside the four border corners (art-deco). */
  cornerOrnament?: "deco";
  /** Faint lines + star dots linking the places, like a star chart. */
  constellationLines?: boolean;

  // ---- Fonts (CSS families, usually a var()) ----
  titleFamily: string;
  nameFamily: string;
  distFamily: string;

  // ---- Type treatment ----
  titleWeight: number;
  titleLetterSpacing: number;
  nameTransform: NameTransform;
  nameWeight: number;
  nameLetterSpacing: number;
  distItalic: boolean;
  distLetterSpacing: number;

  // ---- Sizes (poster units) ----
  titleSize: number;
  subtitleSize: number;
  nameSize: number;
  distSize: number;
  lineHeight: number;
  arrowWidth: number;
  arrowhead: ArrowheadStyle;
  arrowheadSize: number;
  homeDotSize: number;
  iconSize: number;

  // ---- Affiliation encoding (adapted per template) ----
  affiliationColors: Record<Affiliation, string>;
  /** Tint arrowheads + home dot by the place's affiliation color. */
  colorizeArrows: boolean;
  /** Opacity for affiliation glyphs (muted on vintage, full on bold). */
  glyphOpacity: number;
};

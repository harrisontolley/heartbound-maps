import type { TemplateSpec } from "./types";

/**
 * User customization layered on top of a chosen template. Color + decoration
 * fields are nullable overrides (null = use the template's value); the show*
 * flags toggle elements that aren't part of the spec; the *Text fields override
 * the auto-generated title / subtitle / footer (null = use the default).
 */
export type Customization = {
  // Color overrides (null = template default).
  paperOverride: string | null;
  inkOverride: string | null;
  accentOverride: string | null;
  // Decoration overrides (null = template default).
  textureOn: boolean | null;
  borderOn: boolean | null;
  roseOn: boolean | null;
  ringGuidesOn: boolean | null;
  // Element visibility (these elements aren't spec fields).
  showLegend: boolean;
  showDistances: boolean;
  showNorth: boolean;
  showFooter: boolean;
  // Text overrides (null = auto-generated default).
  titleText: string | null;
  subtitleText: string | null;
  footerText: string | null;
};

export const DEFAULT_CUSTOMIZATION: Customization = {
  paperOverride: null,
  inkOverride: null,
  accentOverride: null,
  textureOn: null,
  borderOn: null,
  roseOn: null,
  ringGuidesOn: null,
  showLegend: true,
  showDistances: true,
  showNorth: true,
  showFooter: true,
  titleText: null,
  subtitleText: null,
  footerText: null,
};

/** Show/hide flags for non-spec poster elements. */
export type DisplayOptions = {
  legend: boolean;
  distances: boolean;
  north: boolean;
  footer: boolean;
};

/** Title / subtitle / footer overrides (null = use the poster default). */
export type TextOverrides = {
  title: string | null;
  subtitle: string | null;
  footer: string | null;
};

export type Resolved = {
  template: TemplateSpec;
  display: DisplayOptions;
  text: TextOverrides;
};

/** True for a non-empty, non-whitespace override string. */
function has(s: string | null): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

/**
 * Merge a customization onto a base template. Returns a fresh derived spec plus
 * the display + text overrides the renderer needs. Pure — safe to memoize on
 * (base, customization).
 */
export function resolveCustomized(
  base: TemplateSpec,
  c: Customization,
): Resolved {
  const template: TemplateSpec = { ...base };

  if (has(c.paperOverride)) template.paper = c.paperOverride;
  if (has(c.inkOverride)) template.ink = c.inkOverride;
  if (has(c.accentOverride)) template.accent = c.accentOverride;

  if (c.textureOn !== null) template.texture = c.textureOn;
  if (c.ringGuidesOn !== null) template.ringGuides = c.ringGuidesOn;
  if (c.roseOn !== null) {
    // Restore a sensible rose when re-enabling a template that has none.
    template.rose = c.roseOn ? (base.rose === "none" ? "tick" : base.rose) : "none";
  }
  if (c.borderOn !== null) {
    template.border = c.borderOn ? (base.border ?? base.ink) : null;
  }

  return {
    template,
    display: {
      legend: c.showLegend,
      distances: c.showDistances,
      north: c.showNorth,
      footer: c.showFooter,
    },
    text: {
      title: has(c.titleText) ? c.titleText : null,
      subtitle: has(c.subtitleText) ? c.subtitleText : null,
      footer: has(c.footerText) ? c.footerText : null,
    },
  };
}

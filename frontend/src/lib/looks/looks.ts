// The condensed set of "recommended" designs shown up front in the studio. Each
// look is an evocative name over an existing template (+ a vintage variant where
// relevant). The four trend-led looks lead the grid; the originals follow. The
// full template set, vintage variants, and every fine-grained control live under
// Advanced — these are the calm first glance.
//
// Selecting a look goes through the store's applyLook(), which sets the template
// + variant and clears customization so one look's overrides never bleed into the
// next. activeLookId() maps current store state back to a look (or null when the
// user has gone "off the rails" into Advanced — a non-classic vintage variant).

import type { TemplateId, VintageVariant } from "../templates/types";

export type LookId =
  | "warm-minimal"
  | "mid-century"
  | "swiss"
  | "celestial"
  | "nightfall"
  | "blueprint"
  | "modern"
  | "field-map"
  | "minimal";

export type Look = {
  id: LookId;
  label: string;
  blurb: string;
  templateId: TemplateId;
  vintageVariant?: VintageVariant;
};

export const LOOKS: Look[] = [
  {
    id: "warm-minimal",
    label: "Warm Minimal",
    blurb: "Warm oat, clay accent, airy negative space.",
    templateId: "warm-minimal",
  },
  {
    id: "mid-century",
    label: "Mid-Century",
    blurb: "70s earth tones, geometric type, bold arrows.",
    templateId: "mid-century",
  },
  {
    id: "swiss",
    label: "Swiss Editorial",
    blurb: "Grotesque grid, tight hierarchy, red accent.",
    templateId: "swiss-editorial",
  },
  {
    id: "celestial",
    label: "Celestial",
    blurb: "Deep indigo, glowing center, muted gold.",
    templateId: "celestial",
  },
  {
    id: "nightfall",
    label: "Nightfall",
    blurb: "Cool navy starfield, dotted rings, silver labels.",
    templateId: "night-sky",
  },
  {
    id: "blueprint",
    label: "Blueprint",
    blurb: "Drafting grid, hairlines, mono labels.",
    templateId: "blueprint",
  },
  {
    id: "modern",
    label: "Modern",
    blurb: "Thick arrows, vivid color, heavy sans.",
    templateId: "bold-modern",
  },
  {
    id: "field-map",
    label: "Field Map",
    blurb: "Contour rings, earthy tones, field-map feel.",
    templateId: "topographic",
  },
  {
    id: "minimal",
    label: "Minimal",
    blurb: "Chalk field, ebony hairlines, generous space.",
    templateId: "minimal-compass",
  },
];

export const LOOK_ORDER: LookId[] = LOOKS.map((l) => l.id);

export const LOOKS_BY_ID: Record<LookId, Look> = Object.fromEntries(
  LOOKS.map((l) => [l.id, l]),
) as Record<LookId, Look>;

export const DEFAULT_LOOK_ID: LookId = "warm-minimal";

/**
 * Which featured look matches the current template + vintage variant, or null
 * when a non-classic vintage variant is active (off the featured rails, under
 * Advanced). Lets the look cards show the right active state.
 */
export function activeLookId(
  templateId: TemplateId,
  vintageVariant: VintageVariant,
): LookId | null {
  const match = LOOKS.find(
    (l) =>
      l.templateId === templateId &&
      (l.templateId !== "vintage-cartography" ||
        l.vintageVariant === vintageVariant),
  );
  return match?.id ?? null;
}

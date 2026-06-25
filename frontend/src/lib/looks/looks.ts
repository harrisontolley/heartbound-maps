// The condensed set of "recommended" designs shown up front in the studio. Each
// look is an evocative name over an existing template (+ a vintage variant where
// relevant). The full template set, vintage variants, and every fine-grained
// control live under Advanced — these six are the calm first glance.
//
// Selecting a look goes through the store's applyLook(), which sets the template
// + variant and clears customization so one look's overrides never bleed into the
// next. activeLookId() maps current store state back to a look (or null when the
// user has gone "off the rails" into Advanced — art-deco, constellation, or a
// non-classic vintage variant).

import type { TemplateId, VintageVariant } from "../templates/types";

export type LookId =
  | "heirloom"
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
    id: "heirloom",
    label: "Heirloom",
    blurb: "Aged paper, compass rose, engraved serif.",
    templateId: "vintage-cartography",
    vintageVariant: "classic",
  },
  {
    id: "nightfall",
    label: "Nightfall",
    blurb: "Navy field, glowing center, golden labels.",
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
    blurb: "Cream, hairline arrows, lots of space.",
    templateId: "minimal-compass",
  },
];

export const LOOK_ORDER: LookId[] = LOOKS.map((l) => l.id);

export const LOOKS_BY_ID: Record<LookId, Look> = Object.fromEntries(
  LOOKS.map((l) => [l.id, l]),
) as Record<LookId, Look>;

export const DEFAULT_LOOK_ID: LookId = "heirloom";

/**
 * Which featured look matches the current template + vintage variant, or null
 * when the selection lives only under Advanced (art-deco, constellation, or a
 * non-classic vintage variant). Lets the look cards show the right active state.
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

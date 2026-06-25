import type { TemplateId, TemplateSpec, VintageVariant } from "./types";
import { vintage } from "./vintage";
import { minimal } from "./minimal";
import { bold } from "./bold";
import { nightSky } from "./nightSky";
import { blueprint } from "./blueprint";
import { artDeco } from "./artDeco";
import { topographic } from "./topographic";
import { constellation } from "./constellation";
import { VINTAGE_VARIANTS } from "./vintageVariants";

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  "vintage-cartography": vintage,
  "minimal-compass": minimal,
  "bold-modern": bold,
  "night-sky": nightSky,
  blueprint,
  "art-deco": artDeco,
  topographic,
  constellation,
};

/** Display order in the switcher — hero first. */
export const TEMPLATE_ORDER: TemplateId[] = [
  "vintage-cartography",
  "minimal-compass",
  "bold-modern",
  "night-sky",
  "blueprint",
  "art-deco",
  "topographic",
  "constellation",
];

export const DEFAULT_TEMPLATE_ID: TemplateId = "vintage-cartography";

export function getTemplate(id: TemplateId): TemplateSpec {
  return TEMPLATES[id];
}

/** Resolve the spec to render, applying the chosen vintage sub-style. */
export function getActiveTemplate(
  id: TemplateId,
  vintageVariant: VintageVariant,
): TemplateSpec {
  if (id === "vintage-cartography") return VINTAGE_VARIANTS[vintageVariant];
  return TEMPLATES[id];
}

import type { Computed, Units } from "@/lib/types";
import type { TemplateSpec } from "@/lib/templates/types";
import { fmtDistance } from "@/lib/geo";

/** Gap between the affiliation icon and the text block, in poster units. */
export const LABEL_ICON_GAP = 10;

/** Names longer than this are ellipsized so they don't blow out the layout. */
const MAX_NAME_CHARS = 20;

/** The two lines of a place label, with truncation + name transform applied. */
export function labelStrings(item: Computed, t: TemplateSpec, units: Units) {
  let name = item.label;
  if (name.length > MAX_NAME_CHARS) {
    name = `${name.slice(0, MAX_NAME_CHARS - 1).trimEnd()}…`;
  }
  if (t.nameTransform === "uppercase") name = name.toUpperCase();
  const dist = fmtDistance(item.distanceKm, units);
  return { name, dist };
}

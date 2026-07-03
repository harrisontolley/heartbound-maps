import type { BearingMode, Place, Units } from "@/lib/types";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";
import type { Customization } from "@/lib/templates/customize";
import type { FrameSelection, StudioFormat } from "@/lib/commerce/price";
import { usePosterStore } from "@/lib/store/posterStore";

// An immutable snapshot of the poster design at the moment it's added to the
// cart. It captures everything needed to re-render/reproduce the poster, so later
// studio edits don't mutate an already-added cart item, and it's persisted onto
// order_items.poster_config for order history + Phase-2 fulfilment.

export type PosterConfigSnapshot = {
  templateId: TemplateId;
  vintageVariant: VintageVariant;
  home: Place | null;
  places: Place[];
  units: Units;
  bearingMode: BearingMode;
  customization: Customization;
  productId: string;
  format: StudioFormat;
  frame: FrameSelection;
};

/** Capture the current poster design from the studio store as a decoupled snapshot. */
export function snapshotPosterConfig(): PosterConfigSnapshot {
  const s = usePosterStore.getState();
  return {
    templateId: s.templateId,
    vintageVariant: s.vintageVariant,
    home: s.home ? { ...s.home } : null,
    places: s.places.map((p) => ({ ...p })),
    units: s.units,
    bearingMode: s.bearingMode,
    customization: { ...s.customization },
    productId: s.productId,
    format: s.format,
    frame: s.frame,
  };
}

/** Short human label for a cart line, e.g. "Vintage · London · 16 × 24 in". */
export function snapshotSummary(snapshot: PosterConfigSnapshot, sizeLabel: string): string {
  const place = snapshot.home?.label ?? "Custom map";
  return [place, sizeLabel].filter(Boolean).join(" · ");
}

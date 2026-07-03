// USD money formatting + selection pricing for the studio's buy flow. The pure
// logic now lives in @pinprint/shared (so the backend recomputes the same totals
// at checkout); this module re-exports it to keep existing frontend import paths
// stable. The pricing fns accept any product carrying the catalogue's numeric
// fields, so the frontend's viewBox-enriched PrintProduct works unchanged.

export {
  formatUsd,
  discountPercent,
  selectionTotalCents,
  selectionLineItems,
  buildSelection,
  FRAME_MATERIALS,
  FRAME_COLORS_BY_MATERIAL,
  FRAME_COLOR_LABELS,
  DEFAULT_FRAME_COLOR,
} from "@pinprint/shared";

export type {
  StudioFormat,
  StudioLineItem,
  StudioSelection,
  FrameMaterial,
  FrameColor,
  FrameSelection,
} from "@pinprint/shared";

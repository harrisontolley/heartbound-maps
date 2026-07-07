// Poster sizes the user can choose. Width/height are in poster units (the SVG
// viewBox); the shared posterGeometry adapts the compass + safe area to each,
// and PNG export follows the viewBox, so every size renders + exports correctly.

export type PosterSizeId =
  | "portrait"
  | "a-series"
  | "square"
  | "landscape"
  | "phone"
  | "desktop";

export type PosterSize = {
  id: PosterSizeId;
  label: string;
  /** Short ratio hint for the UI. */
  ratio: string;
  width: number;
  height: number;
};

export const POSTER_SIZES: Record<PosterSizeId, PosterSize> = {
  portrait: { id: "portrait", label: "Portrait", ratio: "2:3", width: 1000, height: 1500 },
  "a-series": { id: "a-series", label: "A-series", ratio: "1:√2", width: 1000, height: 1414 },
  square: { id: "square", label: "Square", ratio: "1:1", width: 1200, height: 1200 },
  landscape: { id: "landscape", label: "Landscape", ratio: "3:2", width: 1500, height: 1000 },
  phone: { id: "phone", label: "Phone", ratio: "9:16", width: 1080, height: 1920 },
  // Not a buyable print size — only ever used to render the free bonus desktop
  // wallpaper captured at add-to-cart (see components/studio/WallpaperCapture.tsx).
  // Not wired into printProducts.ts's Orientation/VIEWBOX map, so it can never
  // surface as a selectable size in the studio.
  desktop: { id: "desktop", label: "Desktop", ratio: "16:9", width: 1920, height: 1080 },
};

export const POSTER_SIZE_ORDER: PosterSizeId[] = [
  "portrait",
  "a-series",
  "square",
  "landscape",
  "phone",
  "desktop",
];

export const DEFAULT_POSTER_SIZE_ID: PosterSizeId = "portrait";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Affiliation, BearingMode, GeoResult, Place, Units } from "../types";
import type { TemplateId, VintageVariant } from "../templates/types";
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from "../templates/registry";
import {
  DEFAULT_POSTER_SIZE_ID,
  type PosterSizeId,
} from "../templates/sizes";
import {
  DEFAULT_CUSTOMIZATION,
  type Customization,
} from "../templates/customize";
import { DEFAULT_PRODUCT_ID } from "../commerce/printProducts";
import {
  DEFAULT_FRAME_COLOR,
  type StudioFormat,
  type FrameSelection,
} from "../commerce/price";
import { LOOKS_BY_ID, type LookId } from "../looks/looks";
import { SEED_HOME, SEED_PLACES } from "../seed";

export type { VintageVariant };

let idCounter = 0;
function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `place-${Date.now()}-${idCounter++}`;
}

/** True if two coordinates are within ~50m (treat as the same place). */
function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.abs(a.lat - b.lat) < 5e-4 && Math.abs(a.lng - b.lng) < 5e-4;
}

export function geoToPlace(r: GeoResult, affiliation: Affiliation): Place {
  return {
    id: newId(),
    label: r.label,
    fullName: r.fullName,
    lat: r.lat,
    lng: r.lng,
    kind: r.kind,
    affiliation,
  };
}

type PosterState = {
  home: Place | null;
  places: Place[];
  units: Units;
  bearingMode: BearingMode;
  templateId: TemplateId;
  vintageVariant: VintageVariant;
  sizeId: PosterSizeId;
  /** Selected print product (drives the preview viewBox + buy price). */
  productId: string;
  /** Whether the buyer is purchasing a physical print or the digital file. */
  format: StudioFormat;
  /** Ready-to-hang frame upsell on a print (ignored when format === "digital"). */
  frame: FrameSelection;
  customization: Customization;

  setHome: (home: Place | null) => void;
  addPlace: (place: Place) => void;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  removePlace: (id: string) => void;
  /** Make a place the home; the previous home becomes a regular place. */
  promoteToHome: (id: string) => void;
  setUnits: (units: Units) => void;
  toggleUnits: () => void;
  setBearingMode: (mode: BearingMode) => void;
  setTemplate: (id: TemplateId) => void;
  setVintageVariant: (v: VintageVariant) => void;
  setSize: (id: PosterSizeId) => void;
  setProduct: (productId: string) => void;
  setFormat: (format: StudioFormat) => void;
  setFrame: (frame: FrameSelection) => void;
  /** Apply a curated look: set its template + variant and clear customization. */
  applyLook: (id: LookId) => void;
  /** Merge a partial customization patch. */
  setCustomization: (patch: Partial<Customization>) => void;
  /** Restore all customization to the active template's defaults. */
  resetCustomization: () => void;
  /** Remove all target places, keep home. */
  clearPlaces: () => void;
  /** Reset to an empty studio (no home, no places). */
  resetAll: () => void;
  /** Start a fresh design: clear home, places, style, and size back to defaults.
   *  Keeps display preferences (units, bearing mode). */
  resetDesign: () => void;
  /** Restore the showcase seed. */
  loadSeed: () => void;
  /** Add a geocoder result; first add becomes home. Returns the outcome. */
  addFromGeo: (
    r: GeoResult,
    affiliation?: Affiliation,
  ) => "home" | "added" | "duplicate";
};

// The in-progress design is auto-saved to localStorage so a refresh or an
// accidental navigation never wipes the buyer's work. Mirrors cartStore:
// `skipHydration` keeps persistence off the SSR path (no hydration mismatch);
// the studio rehydrates once after mount, then applies any ?template deep link
// on top so an explicit link still wins (see PosterStudio). `partialize` saves
// only the design data — never the setter functions.
export const usePosterStore = create<PosterState>()(
  persist(
    (set, get) => ({
  // Start empty — first-time buyers are guided to enter their own home + places.
  // SEED_HOME/SEED_PLACES survive as the preview "Example" sample (PosterStudio)
  // and the loadSeed() helper.
  home: null,
  places: [],
  units: "mi",
  bearingMode: "great-circle",
  templateId: DEFAULT_TEMPLATE_ID,
  vintageVariant: "classic",
  sizeId: DEFAULT_POSTER_SIZE_ID,
  productId: DEFAULT_PRODUCT_ID,
  format: "print",
  frame: null,
  customization: DEFAULT_CUSTOMIZATION,

  setHome: (home) => set({ home }),
  addPlace: (place) => set((s) => ({ places: [...s.places, place] })),
  updatePlace: (id, patch) =>
    set((s) => ({
      places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePlace: (id) =>
    set((s) => ({ places: s.places.filter((p) => p.id !== id) })),
  promoteToHome: (id) =>
    set((s) => {
      const target = s.places.find((p) => p.id === id);
      if (!target) return s;
      const rest = s.places.filter((p) => p.id !== id);
      return { home: target, places: s.home ? [s.home, ...rest] : rest };
    }),
  setUnits: (units) => set({ units }),
  toggleUnits: () => set((s) => ({ units: s.units === "km" ? "mi" : "km" })),
  setBearingMode: (bearingMode) => set({ bearingMode }),
  setTemplate: (templateId) => set({ templateId }),
  setVintageVariant: (vintageVariant) => set({ vintageVariant }),
  setSize: (sizeId) => set({ sizeId }),
  setProduct: (productId) => set({ productId }),
  setFormat: (format) => set({ format }),
  setFrame: (frame) => set({ frame }),
  applyLook: (id) => {
    const look = LOOKS_BY_ID[id];
    set({
      templateId: look.templateId,
      vintageVariant: look.vintageVariant ?? "classic",
      customization: DEFAULT_CUSTOMIZATION,
    });
  },
  setCustomization: (patch) =>
    set((s) => ({ customization: { ...s.customization, ...patch } })),
  resetCustomization: () => set({ customization: DEFAULT_CUSTOMIZATION }),
  clearPlaces: () => set({ places: [] }),
  resetAll: () => set({ home: null, places: [] }),
  resetDesign: () =>
    set({
      home: null,
      places: [],
      templateId: DEFAULT_TEMPLATE_ID,
      vintageVariant: "classic",
      sizeId: DEFAULT_POSTER_SIZE_ID,
      productId: DEFAULT_PRODUCT_ID,
      format: "print",
      frame: null,
      customization: DEFAULT_CUSTOMIZATION,
    }),
  loadSeed: () => set({ home: SEED_HOME, places: SEED_PLACES }),
  addFromGeo: (r, affiliation = "visited") => {
    const s = get();
    if (!s.home) {
      set({ home: geoToPlace(r, "lived") });
      return "home";
    }
    if ([s.home, ...s.places].some((p) => sameSpot(p, r))) return "duplicate";
    set((st) => ({ places: [...st.places, geoToPlace(r, affiliation)] }));
    return "added";
  },
    }),
    {
      name: "pinprint-draft-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        home: s.home,
        places: s.places,
        units: s.units,
        bearingMode: s.bearingMode,
        templateId: s.templateId,
        vintageVariant: s.vintageVariant,
        sizeId: s.sizeId,
        productId: s.productId,
        format: s.format,
        frame: s.frame,
        customization: s.customization,
      }),
      merge: (persisted, current) => {
        const { addFrame, ...p } = (persisted ?? {}) as Partial<PosterState> & {
          /** Pre-frame-picker drafts stored a boolean toggle instead of `frame`. */
          addFrame?: boolean;
        };
        return {
          ...current,
          ...p,
          // A draft saved against a since-removed template falls back to default.
          templateId:
            p.templateId && p.templateId in TEMPLATES
              ? p.templateId
              : current.templateId,
          // Drafts saved before the frame picker carry `addFrame` and no `frame`
          // key; addFrame:true meant the one frame sold then (today's default).
          frame:
            "frame" in p
              ? (p.frame ?? null)
              : addFrame
                ? { material: "Oak", color: DEFAULT_FRAME_COLOR }
                : null,
          // Backfill any customization keys added since the draft was saved.
          customization: { ...DEFAULT_CUSTOMIZATION, ...(p.customization ?? {}) },
        };
      },
    },
  ),
);

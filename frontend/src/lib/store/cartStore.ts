import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSelection, type StudioSelection } from "@/lib/commerce/price";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";
import type { PosterConfigSnapshot } from "@/lib/commerce/posterConfig";

// The shopping cart: a localStorage-persisted list of fully-configured posters.
// Cart state is client-only (no auth needed) — the buyer is identified at
// checkout. Persistence uses skipHydration so it never touches localStorage
// during SSR; <CartHydrator/> rehydrates once on the client (see providers).

const MAX_QTY = 25;

export type CartItem = {
  id: string;
  /** Priced snapshot (size, format, frame, total) for display. */
  selection: StudioSelection;
  /** Immutable design snapshot sent to checkout as poster_config. */
  posterConfig: PosterConfigSnapshot;
  /**
   * Public URL of the full-res poster PNG (uploaded at add-to-cart) — the
   * print-DPI export for print format, a 3x rasterization for digital.
   */
  assetUrl?: string;
  /**
   * Public URL of the vector SVG (uploaded at add-to-cart), captured for both
   * formats — the digital tier's actual deliverable, and a bonus for print
   * buyers.
   */
  svgAssetUrl?: string;
  /**
   * Public URL of the bonus phone wallpaper PNG (9:16, uploaded at
   * add-to-cart, best-effort) — a render of the buyer's exact design at
   * phone-wallpaper proportions, delivered post-payment alongside the other
   * digital files.
   */
  phoneWallpaperAssetUrl?: string;
  /**
   * Public URL of the bonus desktop wallpaper PNG (16:9), the same bonus
   * render at desktop-wallpaper proportions.
   */
  desktopWallpaperAssetUrl?: string;
  quantity: number;
  addedAt: number;
};

type CartState = {
  items: CartItem[];
  addItem: (entry: {
    selection: StudioSelection;
    posterConfig: PosterConfigSnapshot;
    assetUrl?: string;
    svgAssetUrl?: string;
    phoneWallpaperAssetUrl?: string;
    desktopWallpaperAssetUrl?: string;
    quantity?: number;
  }) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `cart-${Date.now()}-${idCounter++}`;
}
let idCounter = 0;

function clampQty(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.round(n)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: ({
        selection,
        posterConfig,
        assetUrl,
        svgAssetUrl,
        phoneWallpaperAssetUrl,
        desktopWallpaperAssetUrl,
        quantity = 1,
      }) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              id: uid(),
              selection,
              posterConfig,
              assetUrl,
              svgAssetUrl,
              phoneWallpaperAssetUrl,
              desktopWallpaperAssetUrl,
              quantity: clampQty(quantity),
              addedAt: Date.now(),
            },
          ],
        })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setQuantity: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, quantity: clampQty(quantity) } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "heartbound-cart-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CartState>;
        return {
          ...currentState,
          ...persisted,
          items: repriceCartItems(Array.isArray(persisted.items) ? persisted.items : []),
        };
      },
    },
  ),
);

/** Refresh saved display snapshots from the catalogue checkout already trusts. */
export function repriceCartItems(items: CartItem[]): CartItem[] {
  return items.map((item) => {
    const product = PRODUCTS_BY_ID[item.selection.productId];
    if (!product) return item;
    return {
      ...item,
      selection: buildSelection({
        format: item.selection.format,
        product,
        frame: item.selection.frame,
      }),
    };
  });
}

/** Total unit count across the cart (for the nav badge). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/** Cart subtotal in integer cents (line total = selection total × quantity). */
export function cartSubtotalCents(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.selection.totalCents * i.quantity, 0);
}

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StudioSelection } from "@/lib/commerce/price";
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
      addItem: ({ selection, posterConfig, assetUrl, svgAssetUrl, quantity = 1 }) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              id: uid(),
              selection,
              posterConfig,
              assetUrl,
              svgAssetUrl,
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
      name: "pinprint-cart-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** Total unit count across the cart (for the nav badge). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/** Cart subtotal in integer cents (line total = selection total × quantity). */
export function cartSubtotalCents(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.selection.totalCents * i.quantity, 0);
}

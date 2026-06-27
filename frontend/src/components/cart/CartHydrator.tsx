"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cartStore";

/**
 * Rehydrates the persisted cart from localStorage on the client. The store uses
 * `skipHydration` so persistence never runs during SSR (no hydration mismatch);
 * this runs the one-time rehydrate after mount. Renders nothing.
 */
export function CartHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}

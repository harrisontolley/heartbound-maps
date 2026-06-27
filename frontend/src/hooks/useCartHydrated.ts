"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cartStore";

/**
 * True once the persisted cart has rehydrated from localStorage. Gate
 * cart-dependent UI on this rather than useHydrated() so we never flash an empty
 * cart before the stored items load. The persist API is touched only inside the
 * effect (client-only) — never during render — so static prerendering, where
 * `persist` isn't available, stays safe and there's no hydration mismatch.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    // rehydrate() resolves once storage has loaded (or immediately if already
    // hydrated by <CartHydrator/>); setState lands in the async callback.
    void Promise.resolve(useCartStore.persist.rehydrate()).then(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return hydrated;
}

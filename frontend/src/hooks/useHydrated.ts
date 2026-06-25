"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the first client render, true once hydrated. Lets us gate
 * client-only rendering (canvas-measured layout) without a setState-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

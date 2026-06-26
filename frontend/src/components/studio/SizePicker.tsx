"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { SizeCard } from "./SizeCard";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";

/**
 * The size selector: the curated 2:3 portrait ladder (good → better → best).
 * One ratio, so there are no orientation tabs — just the three size cards. Single
 * source of truth is the store's productId.
 */
export function SizePicker() {
  const productId = usePosterStore((s) => s.productId);
  const setProduct = usePosterStore((s) => s.setProduct);

  return (
    <div className="grid grid-cols-3 gap-2">
      {OFFERED_PRODUCTS.map((p) => (
        <SizeCard
          key={p.id}
          product={p}
          active={p.id === productId}
          badge={p.badge ?? (p.popular ? "Popular" : undefined)}
          onSelect={() => setProduct(p.id)}
        />
      ))}
    </div>
  );
}

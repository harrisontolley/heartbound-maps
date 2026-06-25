"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { PillButton } from "@/components/ui/PillButton";
import { SizeCard } from "./SizeCard";
import {
  ORIENTATION_ORDER,
  ORIENTATION_LABELS,
  PRODUCTS_BY_ID,
  productsByOrientation,
  type Orientation,
} from "@/lib/commerce/printProducts";

/**
 * The size selector: orientation tabs over a grid of print-size cards. Single
 * source of truth is the store's productId, so the active orientation is derived
 * from it. Switching orientation reshapes the poster by selecting that
 * orientation's popular (or first) size.
 */
export function SizePicker() {
  const productId = usePosterStore((s) => s.productId);
  const setProduct = usePosterStore((s) => s.setProduct);

  const current = PRODUCTS_BY_ID[productId];
  const orientation = current.orientation;
  const sizes = productsByOrientation(orientation);

  function selectOrientation(o: Orientation) {
    if (o === orientation) return;
    const list = productsByOrientation(o);
    const pick = list.find((p) => p.popular) ?? list[0];
    setProduct(pick.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {ORIENTATION_ORDER.map((o) => (
          <PillButton
            key={o}
            size="sm"
            active={o === orientation}
            onClick={() => selectOrientation(o)}
          >
            {ORIENTATION_LABELS[o]}
          </PillButton>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sizes.map((p) => (
          <SizeCard
            key={p.id}
            product={p}
            active={p.id === productId}
            onSelect={() => setProduct(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

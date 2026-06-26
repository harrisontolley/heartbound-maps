"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { formatUsd } from "@/lib/commerce/price";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";

/**
 * The single ready-to-hang frame upsell. A checkbox card (ink-ring when on, same
 * language as the size cards) that adds the per-size frame upcharge to the total.
 * Rendered only on the print path — the parent gates on format === "print".
 */
export function FrameUpsellCard() {
  const productId = usePosterStore((s) => s.productId);
  const addFrame = usePosterStore((s) => s.addFrame);
  const setAddFrame = usePosterStore((s) => s.setAddFrame);
  const product = PRODUCTS_BY_ID[productId];

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-surface-card p-3 transition-colors ${
        addFrame
          ? "border-ink ring-1 ring-ink"
          : "border-hairline hover:border-hairline-strong"
      }`}
    >
      <input
        type="checkbox"
        checked={addFrame}
        onChange={(e) => setAddFrame(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded-xs border-hairline-strong accent-ink"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">
            Add a ready-to-hang frame
          </span>
          <span className="shrink-0 rounded-pill bg-surface-strong px-2 py-0.5 text-xs font-semibold text-ink">
            +{formatUsd(product.frameUpchargeCents)}
          </span>
        </span>
        <span className="text-xs text-muted">
          Solid wood, glass front — arrives wired to hang.
        </span>
      </span>
    </label>
  );
}

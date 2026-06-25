"use client";

import { Button } from "@/components/ui/Button";
import { formatUsd } from "@/lib/commerce/price";
import {
  ORIENTATION_LABELS,
  type PrintProduct,
} from "@/lib/commerce/printProducts";

/**
 * The sticky commerce strip. Shows the chosen size + placeholder price and the
 * single ink-pill primary "Add to cart". Checkout is not built yet, so the CTA is
 * a disabled stub — onAddToCart is the seam a real cart drops into later.
 */
export function BuyBar({
  product,
  canBuy,
  onAddToCart,
}: {
  product: PrintProduct;
  /** False until a home is set (mirrors export gating). */
  canBuy: boolean;
  onAddToCart: (product: PrintProduct) => void;
}) {
  const hint = canBuy ? "Checkout coming soon" : "Add a place to start";

  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-hairline bg-canvas/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">
            {product.label}
          </div>
          <div className="truncate text-xs text-muted">
            {ORIENTATION_LABELS[product.orientation]} · museum-grade print
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-display text-2xl leading-none text-ink">
              {formatUsd(product.priceCents)}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">{hint}</div>
          </div>
          <Button
            variant="primary"
            onClick={() => onAddToCart(product)}
            disabled
            title="Checkout coming soon"
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}

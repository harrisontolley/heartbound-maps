"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  formatUsd,
  selectionTotalCents,
  selectionLineItems,
  buildSelection,
  type StudioFormat,
  type StudioSelection,
} from "@/lib/commerce/price";
import type { PrintProduct } from "@/lib/commerce/printProducts";

/**
 * The sticky commerce strip. Shows a live total for the current selection
 * (print ± frame, or the digital file) with a small breakdown, and the single
 * ink-pill primary "Add to cart" — which adds a complete StudioSelection
 * snapshot to the cart. After an add it briefly surfaces a "View cart" link.
 */
export function BuyBar({
  product,
  format,
  addFrame,
  canBuy,
  justAdded = false,
  onAddToCart,
}: {
  product: PrintProduct;
  format: StudioFormat;
  addFrame: boolean;
  /** False until a home is set (mirrors export gating). */
  canBuy: boolean;
  /** True for a moment after an add, to show the confirmation link. */
  justAdded?: boolean;
  onAddToCart: (selection: StudioSelection) => void;
}) {
  const total = selectionTotalCents({ format, product, addFrame });
  const items = selectionLineItems({ format, product, addFrame });
  const hint = canBuy ? "Free shipping" : "Add a place to start";
  const title = format === "digital" ? "Digital download" : product.label;
  const subtitle =
    format === "digital"
      ? "High-resolution digital download"
      : `Museum-grade print · digital file included${addFrame ? " · framed" : ""}`;

  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-hairline bg-canvas/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{title}</div>
          <div className="truncate text-xs text-muted">{subtitle}</div>
          {items.length > 1 && (
            <ul className="mt-1 hidden flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted sm:flex">
              {items.map((it) => (
                <li key={it.label}>
                  {it.label}{" "}
                  <span className="text-body-strong">
                    {it.cents === 0 ? "Free" : formatUsd(it.cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-display text-2xl leading-none text-ink">
              {formatUsd(total)}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {justAdded ? (
                <Link
                  href="/cart"
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  Added ✓ View cart →
                </Link>
              ) : (
                hint
              )}
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() =>
              onAddToCart(buildSelection({ format, product, addFrame }))
            }
            disabled={!canBuy}
            title={canBuy ? "Add to cart" : "Add a place to start"}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}

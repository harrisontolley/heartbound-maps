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
  type FrameSelection,
} from "@/lib/commerce/price";
import type { PrintProduct } from "@/lib/commerce/printProducts";
import {
  FREE_SHIPPING,
  OPENING_LAUNCH_SALE_LABEL,
} from "@/lib/commerce/pricing";

/**
 * The sticky commerce strip. Shows a live total for the current selection
 * (print ± frame, or the digital file) with a small breakdown, and the single
 * ink-pill primary "Add to cart" — which adds a complete StudioSelection
 * snapshot to the cart. After an add it briefly surfaces a "View cart" link.
 */
export function BuyBar({
  product,
  format,
  frame,
  canBuy,
  justAdded = false,
  busy = false,
  onAddToCart,
}: {
  product: PrintProduct;
  format: StudioFormat;
  frame: FrameSelection;
  /** False until a home is set (mirrors export gating). */
  canBuy: boolean;
  /** True for a moment after an add, to show the confirmation link. */
  justAdded?: boolean;
  /** True while the print is being rasterized + uploaded for fulfilment. */
  busy?: boolean;
  onAddToCart: (selection: StudioSelection) => void;
}) {
  const total = selectionTotalCents({ format, product, frame });
  const items = selectionLineItems({ format, product, frame });
  const savedCents = items.reduce(
    (sum, it) => sum + Math.max(0, (it.listCents ?? it.cents) - it.cents),
    0,
  );
  const shipNote = FREE_SHIPPING ? "Free shipping" : "Shipping calculated at checkout";
  const hint = !canBuy
    ? "Add a place to start"
    : savedCents > 0
      ? `${OPENING_LAUNCH_SALE_LABEL} · save ${formatUsd(savedCents)} · ${shipNote}`
      : shipNote;
  const title = format === "digital" ? "Digital download" : product.label;
  const subtitle =
    format === "digital"
      ? "Print-ready 300 DPI files (PNG + SVG)"
      : frame
        ? "Premium-framed cotton-rag fine art print · digital file included"
        : "Hahnemühle German Etching 310gsm fine art print · digital file included";

  return (
    <div
      className="sticky bottom-0 z-20 shrink-0 border-t border-hairline bg-canvas/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        {/* Title/subtitle are redundant on the Review step (the summary lists
            them) and crowd the bar on a phone — hide them below sm so the price
            and CTA get the full width. */}
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-sm font-medium text-ink">{title}</div>
          <div className="truncate text-xs text-muted">{subtitle}</div>
          {items.length > 1 && (
            <ul className="mt-1 hidden flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted sm:flex">
              {items.map((it) => (
                <li key={it.label}>
                  {it.label}{" "}
                  {it.listCents != null && it.listCents > it.cents && (
                    <span className="text-muted line-through">
                      {formatUsd(it.listCents)}
                    </span>
                  )}{" "}
                  <span className="text-body-strong">
                    {it.cents === 0 ? "Free" : formatUsd(it.cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
          <div className="text-left sm:text-right">
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
            className="shrink-0 whitespace-nowrap"
            onClick={() =>
              onAddToCart(buildSelection({ format, product, frame }))
            }
            disabled={!canBuy || busy}
            title={canBuy ? "Add to cart" : "Add a place to start"}
          >
            {busy ? "Preparing…" : "Add to cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}

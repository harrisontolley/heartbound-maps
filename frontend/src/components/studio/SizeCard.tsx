"use client";

import { formatUsd, discountPercent } from "@/lib/commerce/price";
import type { PrintProduct } from "@/lib/commerce/printProducts";
import { OPENING_LAUNCH_SALE_LABEL } from "@/lib/commerce/pricing";

/**
 * One purchasable print size: the dimensions and the price. Active = ink ring
 * (matches the look cards). The optional badge ("Popular", "Premium") is a quiet
 * chip in a reserved top row so all cards align; it falls back to product.popular.
 */
export function SizeCard({
  product,
  active,
  badge,
  onSelect,
}: {
  product: PrintProduct;
  active: boolean;
  badge?: string;
  onSelect: () => void;
}) {
  const badgeLabel = badge ?? (product.popular ? "Popular" : null);
  const off = discountPercent(product.listPriceCents, product.priceCents);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-lg border bg-surface-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        active
          ? "border-ink ring-1 ring-ink"
          : "border-hairline hover:border-hairline-strong"
      }`}
    >
      <span className="flex h-4 w-full items-center justify-end">
        {badgeLabel && (
          <span className="rounded-pill bg-surface-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
            {badgeLabel}
          </span>
        )}
      </span>
      <span className="text-[15px] font-medium text-ink">{product.label}</span>
      {/* Stacked so the anchored list price + sale + discount never overflow a
          narrow card (the size grid is 3-up, ~110px per card on a phone). */}
      <span className="flex flex-col gap-0.5">
        {off > 0 && (
          <span className="text-xs text-muted line-through">
            {formatUsd(product.listPriceCents)}
          </span>
        )}
        <span className="flex items-baseline gap-1 text-sm">
          <span className="text-body-strong">{formatUsd(product.priceCents)}</span>
          {off > 0 && (
            <span className="text-[10px] font-semibold text-success">
              {OPENING_LAUNCH_SALE_LABEL} · −{off}%
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

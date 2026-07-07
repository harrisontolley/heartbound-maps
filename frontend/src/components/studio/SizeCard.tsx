"use client";

import { formatUsd } from "@/lib/commerce/price";
import type { PrintProduct } from "@/lib/commerce/printProducts";

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
      <span className="text-[15px] font-medium text-ink">
        {product.tierName ? `${product.tierName} · ${product.label}` : product.label}
      </span>
      <span className="text-sm text-body-strong">{formatUsd(product.priceCents)}</span>
    </button>
  );
}

"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { activeLookId, LOOKS_BY_ID } from "@/lib/looks/looks";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";
import { FreeDesignForm } from "./FreeDesignForm";

/**
 * Final step — a compact summary of the build plus the email-gated free
 * design form (which replaced the old ungated SVG/PNG downloads). The
 * running price + "Add to cart" live in the BuyBar that the host renders
 * directly below this panel.
 */
export function StepReview({
  getSvg,
  canSubmit,
}: {
  getSvg: () => SVGSVGElement | null;
  /** False until a home is set — mirrors the buy/export gating. */
  canSubmit: boolean;
}) {
  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);
  const templateId = usePosterStore((s) => s.templateId);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const productId = usePosterStore((s) => s.productId);
  const format = usePosterStore((s) => s.format);
  const addFrame = usePosterStore((s) => s.addFrame);

  const lookId = activeLookId(templateId, vintageVariant);
  const lookLabel = lookId ? LOOKS_BY_ID[lookId].label : "Custom";
  const product = PRODUCTS_BY_ID[productId];
  const sizeLabel =
    format === "digital"
      ? "Digital download"
      : `${product.label}${addFrame ? " · framed" : ""}`;

  const rows = [
    { k: "Style", v: lookLabel },
    { k: "Home", v: home?.label ?? "Not set" },
    { k: "Places", v: `${places.length} added` },
    { k: "Size", v: sizeLabel },
  ];

  return (
    <div className="flex flex-col gap-5">
      <dl className="overflow-hidden rounded-xl border border-hairline bg-surface-card">
        {rows.map((r, i) => (
          <div
            key={r.k}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              i > 0 ? "border-t border-hairline" : ""
            }`}
          >
            <dt className="text-[11px] uppercase tracking-[0.09em] text-muted">
              {r.k}
            </dt>
            <dd className="truncate text-sm font-medium text-ink">{r.v}</dd>
          </div>
        ))}
      </dl>

      <FreeDesignForm getSvg={getSvg} canSubmit={canSubmit} />
    </div>
  );
}

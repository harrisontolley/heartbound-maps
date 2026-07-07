"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePosterStore } from "@/lib/store/posterStore";
import { activeLookId, LOOKS_BY_ID } from "@/lib/looks/looks";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";
import { FRAME_COLOR_LABELS, type FrameColor } from "@/lib/commerce/price";
import { copy } from "@/components/landing/copy";
import { FreeDesignForm } from "./FreeDesignForm";

/** Same mitred-corner swatches as FrameUpsellCard's picker (frontend/scripts/frames/PROMPTS.md). */
const FRAME_SWATCH_SRC: Record<FrameColor, string> = {
  NaturalOak: "/frames/oak-natural.png",
  BlackOak: "/frames/oak-black.png",
  WhiteOak: "/frames/oak-white.png",
  WalnutOak: "/frames/oak-walnut.png",
  WhiteMetal: "/frames/metal-white.png",
  BlackMetal: "/frames/metal-black.png",
  SilverMetal: "/frames/metal-silver.png",
  GoldMetal: "/frames/metal-gold.png",
};

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
  const frame = usePosterStore((s) => s.frame);

  const lookId = activeLookId(templateId, vintageVariant);
  const lookLabel = lookId ? LOOKS_BY_ID[lookId].label : "Custom";
  const product = PRODUCTS_BY_ID[productId];

  const sizeValue: ReactNode =
    format === "digital" ? (
      "Digital download"
    ) : frame ? (
      <span className="flex items-center justify-end gap-2">
        {product.label} · {FRAME_COLOR_LABELS[frame.color]} frame
        <span className="relative size-6 shrink-0 overflow-hidden rounded-full border border-hairline-strong/40">
          <Image
            src={FRAME_SWATCH_SRC[frame.color]}
            alt={`${FRAME_COLOR_LABELS[frame.color]} frame`}
            fill
            sizes="24px"
            className="object-cover"
          />
        </span>
      </span>
    ) : (
      product.label
    );

  const rows: { k: string; v: ReactNode }[] = [
    { k: "Style", v: lookLabel },
    { k: "Home", v: home?.label ?? "Not set" },
    { k: "Places", v: `${places.length} added` },
    { k: "Size", v: sizeValue },
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
            <dd
              className={`min-w-0 text-right text-sm font-medium text-ink ${
                typeof r.v === "string" ? "truncate" : ""
              }`}
            >
              {r.v}
            </dd>
          </div>
        ))}
      </dl>

      <FreeDesignForm getSvg={getSvg} canSubmit={canSubmit} />

      <p className="text-[12px] leading-[1.5] text-muted">
        The free emailed design is screen resolution. Ordered prints are rendered
        on our servers at 300 DPI, so every hairline and label comes out sharp.
      </p>

      <p className="text-[12px] leading-[1.5] text-muted">
        Every print is covered by the{" "}
        <Link
          href="/guarantee"
          className="text-ink underline-offset-2 hover:underline"
        >
          {copy.guarantee.name}
        </Link>
        : arrives damaged or flawed, and we&apos;ll replace it free or refund
        you in full.
      </p>
    </div>
  );
}

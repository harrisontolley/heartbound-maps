"use client";

import Image from "next/image";
import { usePosterStore } from "@/lib/store/posterStore";
import {
  formatUsd,
  FRAME_COLORS_BY_MATERIAL,
  FRAME_COLOR_LABELS,
  FRAME_MATERIALS,
  DEFAULT_FRAME_COLOR,
  type FrameColor,
  type FrameMaterial,
} from "@/lib/commerce/price";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";
import { PillButton } from "@/components/ui/PillButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";

/**
 * Mitred-corner product shot per frame color (frontend/scripts/frames/
 * PROMPTS.md — our own renders, matching Artelo's own corner-shot picker
 * convention but never their photos). Presentation-only, not the wire
 * contract.
 */
const SWATCH_SRC: Record<FrameColor, string> = {
  NaturalOak: "/frames/oak-natural.png",
  BlackOak: "/frames/oak-black.png",
  WhiteOak: "/frames/oak-white.png",
  WalnutOak: "/frames/oak-walnut.png",
  WhiteMetal: "/frames/metal-white.png",
  BlackMetal: "/frames/metal-black.png",
  SilverMetal: "/frames/metal-silver.png",
  GoldMetal: "/frames/metal-gold.png",
};

const MATERIAL_LABELS: Record<FrameMaterial, string> = { Oak: "Oak", Metal: "Metal" };

/**
 * The ready-to-hang frame upsell: a checkbox that turns framing on/off, and
 * once on, a material tab (Oak/Metal) + 4-color swatch picker. All 8 colors
 * cost the same (see docs/integrations/artelo.md's COGS spike), so the price
 * chip never changes when the color does — only when the checkbox does.
 * Rendered only on the print path — the parent gates on format === "print".
 */
export function FrameUpsellCard() {
  const productId = usePosterStore((s) => s.productId);
  const frame = usePosterStore((s) => s.frame);
  const setFrame = usePosterStore((s) => s.setFrame);
  const product = PRODUCTS_BY_ID[productId];
  const framed = frame !== null;
  const material = frame?.material ?? "Oak";
  const track = useTrackEvent();

  function trackFrame(next: { material: FrameMaterial; color: FrameColor }) {
    track(ANALYTICS_EVENTS.frameSelected, {
      frame_material: next.material,
      frame_color: next.color,
      upcharge_cents: product.frameUpchargeCents,
    });
  }

  function toggleFramed(on: boolean) {
    const next = on ? { material: "Oak" as const, color: DEFAULT_FRAME_COLOR } : null;
    setFrame(next);
    if (next) trackFrame(next);
  }

  function selectMaterial(m: FrameMaterial) {
    if (m === material) return;
    // Switching material resets to that material's first color — the two
    // materials' colors aren't equivalent by position, so there's no sane
    // "closest match" to carry over.
    const next = { material: m, color: FRAME_COLORS_BY_MATERIAL[m][0] };
    setFrame(next);
    trackFrame(next);
  }

  function selectColor(color: FrameColor) {
    const next = { material, color };
    setFrame(next);
    trackFrame(next);
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-surface-card p-3 transition-colors ${
        framed ? "border-ink ring-1 ring-ink" : "border-hairline hover:border-hairline-strong"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={framed}
          onChange={(e) => toggleFramed(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded-xs border-hairline-strong accent-ink"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">Add a ready-to-hang frame</span>
            <span className="shrink-0 rounded-pill bg-surface-strong px-2 py-0.5 text-xs font-semibold text-ink">
              +{formatUsd(product.frameUpchargeCents)}
            </span>
          </span>
          <span className="text-xs text-muted">
            Premium oak or metal with a glass front. Arrives wired, ready to hang.
          </span>
        </span>
      </label>

      {framed && (
        <div className="flex flex-col gap-3 pl-7">
          <div className="flex gap-3">
            {/* Large preview of the chosen frame — the small swatches below are
                for picking, this is for actually seeing the material/color. */}
            <span className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-hairline-strong/40 bg-surface-strong sm:size-32">
              <Image
                key={frame.color}
                src={SWATCH_SRC[frame.color]}
                alt={FRAME_COLOR_LABELS[frame.color]}
                fill
                sizes="128px"
                className="object-cover"
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-sm font-medium text-ink">{FRAME_COLOR_LABELS[frame.color]}</p>
              <div className="flex gap-1.5">
                {FRAME_MATERIALS.map((m) => (
                  <PillButton
                    key={m}
                    size="sm"
                    active={m === material}
                    onClick={() => selectMaterial(m)}
                  >
                    {MATERIAL_LABELS[m]}
                  </PillButton>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {FRAME_COLORS_BY_MATERIAL[material].map((color) => {
                  const active = frame?.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={active}
                      aria-label={FRAME_COLOR_LABELS[color]}
                      title={FRAME_COLOR_LABELS[color]}
                      onClick={() => selectColor(color)}
                      className={`flex size-12 items-center justify-center rounded-full border-2 transition-colors ${
                        active ? "border-ink" : "border-transparent hover:border-hairline-strong"
                      }`}
                    >
                      <span className="relative size-10 overflow-hidden rounded-full border border-hairline-strong/40">
                        <Image
                          src={SWATCH_SRC[color]}
                          alt={FRAME_COLOR_LABELS[color]}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

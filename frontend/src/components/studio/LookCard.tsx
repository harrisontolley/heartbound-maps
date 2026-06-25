"use client";

import { LookThumb } from "./LookThumb";
import type { Look } from "@/lib/looks/looks";

/**
 * One "atlas plate" in the look picker: a live mini-poster swatch over its
 * evocative name + blurb. Active = ink ring (never a saturated color, per
 * DESIGN.md); ring (not a thicker border) so selection causes no layout shift.
 */
export function LookCard({
  look,
  active,
  onSelect,
}: {
  look: Look;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-surface-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        active
          ? "border-ink ring-1 ring-ink"
          : "border-hairline hover:border-hairline-strong"
      }`}
    >
      <div className="border-b border-hairline-soft">
        <LookThumb look={look} />
      </div>
      <div className="px-3 py-2.5">
        <div className="font-display text-lg leading-none text-ink">
          {look.label}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted">{look.blurb}</p>
      </div>
    </button>
  );
}

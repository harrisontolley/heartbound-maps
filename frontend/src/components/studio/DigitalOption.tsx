"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { Button } from "@/components/ui/Button";
import { formatUsd, discountPercent } from "@/lib/commerce/price";
import {
  DIGITAL_PRICE_CENTS,
  DIGITAL_LIST_PRICE_CENTS,
} from "@/lib/commerce/pricing";

/**
 * The digital file as a low-friction tripwire. On the print path it's a quiet
 * one-liner that flips the whole buy to the cheap digital download; in digital
 * mode it's the selected card with a way back to prints. Prints stay the hero.
 */
export function DigitalOption() {
  const format = usePosterStore((s) => s.format);
  const setFormat = usePosterStore((s) => s.setFormat);
  const off = discountPercent(DIGITAL_LIST_PRICE_CENTS, DIGITAL_PRICE_CENTS);

  if (format === "digital") {
    return (
      <div className="flex flex-col gap-0.5 rounded-xl border border-ink bg-surface-card p-3 ring-1 ring-ink">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">Digital download</span>
          <span className="flex items-baseline gap-1.5 leading-none">
            {off > 0 && (
              <span className="text-xs text-muted line-through">
                {formatUsd(DIGITAL_LIST_PRICE_CENTS)}
              </span>
            )}
            <span className="font-display text-lg text-ink">
              {formatUsd(DIGITAL_PRICE_CENTS)}
            </span>
          </span>
        </div>
        <span className="text-xs text-muted">
          Print-ready 300 DPI files (PNG + SVG), yours to print anywhere. The
          free emailed design is screen resolution; this is the full-resolution
          version.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFormat("print")}
          className="mt-2 self-start"
        >
          ← Back to print sizes
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFormat("digital")}
      className="text-left text-xs text-muted transition-colors hover:text-ink"
    >
      Printing it yourself?{" "}
      <span className="font-medium text-ink underline underline-offset-2">
        Get the print-ready 300 DPI file for {formatUsd(DIGITAL_PRICE_CENTS)}
      </span>
    </button>
  );
}

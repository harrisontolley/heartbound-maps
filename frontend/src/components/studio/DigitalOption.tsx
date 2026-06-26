"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { formatUsd } from "@/lib/commerce/price";
import { DIGITAL_PRICE_CENTS } from "@/lib/commerce/pricing";

/**
 * The digital file as a low-friction tripwire. On the print path it's a quiet
 * one-liner that flips the whole buy to the cheap digital download; in digital
 * mode it's the selected card with a way back to prints. Prints stay the hero.
 */
export function DigitalOption() {
  const format = usePosterStore((s) => s.format);
  const setFormat = usePosterStore((s) => s.setFormat);

  if (format === "digital") {
    return (
      <div className="flex flex-col gap-0.5 rounded-xl border border-ink bg-surface-card p-3 ring-1 ring-ink">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">Digital download</span>
          <span className="font-display text-lg leading-none text-ink">
            {formatUsd(DIGITAL_PRICE_CENTS)}
          </span>
        </div>
        <span className="text-xs text-muted">
          Print-ready high-resolution file. Yours to print anywhere.
        </span>
        <button
          type="button"
          onClick={() => setFormat("print")}
          className="mt-1 self-start text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          ← Back to prints
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFormat("digital")}
      className="text-left text-xs text-muted transition-colors hover:text-ink"
    >
      Just want the file?{" "}
      <span className="font-medium text-ink underline underline-offset-2">
        Download a print-ready high-res version for {formatUsd(DIGITAL_PRICE_CENTS)}
      </span>
    </button>
  );
}

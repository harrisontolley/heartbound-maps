"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { SizePicker } from "@/components/studio/SizePicker";
import { FrameUpsellCard } from "@/components/studio/FrameUpsellCard";
import { DigitalOption } from "@/components/studio/DigitalOption";

/**
 * Step 3 — print size + frame, or the digital file. Lifted from the old
 * ConfigRail "Size" section. The digital option is always offered; print-only
 * controls (size grid, frame upsell) hide when the format is digital.
 */
export function StepSize() {
  const format = usePosterStore((s) => s.format);

  return (
    <div className="flex flex-col gap-3">
      {format === "print" && (
        <>
          <SizePicker />
          <FrameUpsellCard />
          <p className="text-xs text-muted">High-res digital file included, free.</p>
        </>
      )}
      <DigitalOption />
    </div>
  );
}

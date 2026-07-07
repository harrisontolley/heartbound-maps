"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { SizePicker } from "@/components/studio/SizePicker";
import { FrameUpsellCard } from "@/components/studio/FrameUpsellCard";
import { DigitalOption } from "@/components/studio/DigitalOption";
import { ValueStack } from "@/components/pricing/ValueStack";

/**
 * Step 3 — print size + frame, or the digital file. Lifted from the old
 * ConfigRail "Size" section. The digital option is always offered; print-only
 * controls (size grid, frame upsell, and the "everything included" stack)
 * hide when the format is digital.
 */
export function StepSize() {
  const format = usePosterStore((s) => s.format);

  return (
    <div className="flex flex-col gap-3">
      {format === "print" && (
        <>
          <SizePicker />
          <FrameUpsellCard />
          <ValueStack variant="condensed" />
        </>
      )}
      <DigitalOption />
    </div>
  );
}

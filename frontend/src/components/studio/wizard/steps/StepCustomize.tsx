"use client";

import { AdvancedPanel } from "@/components/studio/AdvancedPanel";

/**
 * Optional step — fine-grained overrides. AdvancedPanel is already fully
 * self-contained (more styles + variant, colors, text, decoration, show toggles,
 * distance/bearing, reset), so this step just frames it as optional.
 */
export function StepCustomize() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Optional — fine-tune colours, text, decorations and units. The defaults
        already suit your chosen style, so skip this unless you want to tweak.
      </p>
      <AdvancedPanel />
    </div>
  );
}

"use client";

import { AdvancedPanel } from "@/components/studio/AdvancedPanel";

/**
 * Make-it-yours step — fine-grained overrides. AdvancedPanel is already fully
 * self-contained (more styles + variant, colors, text, decoration, show toggles,
 * distance/bearing, reset). The defaults already suit the chosen style, so this
 * step is quick to pass through but always on the path.
 */
export function StepCustomize() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Fine-tune colours, text, decorations and units. The defaults already suit
        your chosen style — tweak anything you like, or carry straight on.
      </p>
      <AdvancedPanel />
    </div>
  );
}

"use client";

import { LookGrid } from "@/components/studio/LookGrid";

/**
 * Step 1 — pick a look. The grid (LookGrid) applies a template + variant and
 * resets customization. The preview is driven by the seeded sample places, so we
 * say so: the user adds their own next.
 */
export function StepStyle() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Choose a look to start. The preview shows a few sample places — you’ll add
        your own in the next step.
      </p>
      <LookGrid />
    </div>
  );
}

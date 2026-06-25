"use client";

import { useMemo } from "react";
import type { BearingMode, Place, Units } from "@/lib/types";
import type { TemplateSpec } from "@/lib/templates/types";
import type { LaidOut } from "@/lib/layout/types";
import { computePlaces } from "@/lib/geo";
import { computeLayout, defaultLayoutConfig } from "@/lib/layout";
import { createMeasurer } from "@/components/poster/measure";

/**
 * Derive the collision-resolved poster geometry from current state. Recomputes
 * when inputs change — including `fontsReady`, so once web fonts load the labels
 * are re-measured against real metrics. Returns [] until a home is set.
 */
export function useMeasuredLayout(opts: {
  home: Place | null;
  places: Place[];
  units: Units;
  template: TemplateSpec;
  width: number;
  height: number;
  fontsReady: boolean;
  bearingMode: BearingMode;
}): LaidOut[] {
  const { home, places, units, template, width, height, fontsReady, bearingMode } =
    opts;

  return useMemo(() => {
    if (!home) return [];
    const computed = computePlaces(home, places, { mode: bearingMode });
    const cfg = defaultLayoutConfig(width, height);
    const measure = createMeasurer(template, units);
    return computeLayout(computed, cfg, measure);
    // fontsReady intentionally included so layout refreshes when fonts settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, places, units, template, width, height, fontsReady, bearingMode]);
}

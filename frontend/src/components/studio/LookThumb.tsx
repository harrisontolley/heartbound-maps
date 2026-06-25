"use client";

import { memo, useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { getActiveTemplate } from "@/lib/templates/registry";
import { computePlaces } from "@/lib/geo";
import { computeLayout, defaultLayoutConfig } from "@/lib/layout";
import { createMeasurer } from "@/components/poster/measure";
import { Poster } from "@/components/poster/Poster";
import type { Look } from "@/lib/looks/looks";
import {
  THUMB_HOME,
  THUMB_PLACES,
  THUMB_W,
  THUMB_H,
} from "@/lib/looks/thumbPreset";

/**
 * A tiny live poster used as a look's swatch. Renders the SAME shared map so
 * cards differ only by style. Memoized on the look so user edits (places, size,
 * units) never recompute it. Client-only to avoid an SSR/hydration mismatch in
 * the measured label boxes.
 *
 * idPrefix MUST be unique per card — the shared <defs> (glow, paper gradient,
 * texture) would otherwise collide and later cards reuse the first card's fills.
 */
function LookThumbInner({ look }: { look: Look }) {
  const mounted = useHydrated();
  const base = getActiveTemplate(look.templateId, look.vintageVariant ?? "classic");

  const items = useMemo(() => {
    const computed = computePlaces(THUMB_HOME, THUMB_PLACES, {
      mode: "great-circle",
    });
    const cfg = defaultLayoutConfig(THUMB_W, THUMB_H);
    return computeLayout(computed, cfg, createMeasurer(base, "mi"));
  }, [base]);

  return (
    <div className="aspect-[2/3] w-full overflow-hidden">
      {mounted ? (
        <Poster
          home={THUMB_HOME}
          items={items}
          template={base}
          units="mi"
          width={THUMB_W}
          height={THUMB_H}
          display={{ legend: false, distances: false, north: false, footer: false }}
          idPrefix={`thumb-${look.id}`}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-surface-strong" />
      )}
    </div>
  );
}

export const LookThumb = memo(LookThumbInner);

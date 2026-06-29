"use client";

import { Poster, POSTER_H, POSTER_W } from "@/components/poster/Poster";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import { getTemplate } from "@/lib/templates/registry";
import type { Place } from "@/lib/types";

// Force the Archivo faces the bold-modern template uses to load before we
// measure, so labels never settle against the swap fallback.
const FONT_PROBES = ['700 40px "Archivo"', '800 40px "Archivo"'];

/**
 * The live "output" poster beside the globe: the bold-modern Pinprint poster for
 * the SAME home + places that drive the globe, so changing the home (the search
 * widget) re-renders both. Mirrors the /render/[id] route's measure pipeline; the
 * Poster SVG is responsive (viewBox + width/height=100%) so it fills the box.
 */
export function LandingPoster({
  home,
  places,
}: {
  home: Place;
  places: Place[];
}) {
  const template = getTemplate("bold-modern");
  const fontsReady = useFontsReady(FONT_PROBES);
  const mounted = useHydrated();

  const measured = useMeasuredLayout({
    home,
    places,
    units: "km",
    template,
    width: POSTER_W,
    height: POSTER_H,
    fontsReady,
    bearingMode: "great-circle",
    scaleByDistance: true,
  });

  return (
    <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-[0_10px_34px_rgba(12,10,9,0.12)]">
      <Poster
        home={home}
        items={mounted ? measured : []}
        template={template}
        units="km"
        width={POSTER_W}
        height={POSTER_H}
        title={home.label}
      />
    </div>
  );
}

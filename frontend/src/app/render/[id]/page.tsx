"use client";

import { use, useEffect } from "react";
import { notFound } from "next/navigation";
import { Poster } from "@/components/poster/Poster";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import { getActiveTemplate } from "@/lib/templates/registry";
import { VINTAGE_VARIANT_ORDER } from "@/lib/templates/vintageVariants";
import { serializePoster } from "@/lib/export";
import { getPreset } from "@/lib/showcase/presets";

const POSTER_W = 1000;
const POSTER_H = 1500;

// Force every face the templates use to load before we measure/embed, so
// display:"swap" can never settle a fallback into the exported PNG.
const FONT_PROBES = [
  '31px "Inter"',
  '88px "Playfair Display"',
  '31px "EB Garamond"',
  '40px "Archivo"',
  '16px "JetBrains Mono"',
];

declare global {
  interface Window {
    __serializePoster?: (svg: SVGSVGElement) => Promise<string>;
  }
}

/**
 * Dev-only headless render target for the landing-page poster images. Mirrors
 * the studio's render pipeline (useMeasuredLayout → Poster) for a single preset
 * keyed by slug, and flips `data-poster-ready` once fonts + layout have settled
 * so the export script (frontend/scripts/render-posters.ts) knows when to grab
 * the SVG. Never reachable in production.
 */
export default function RenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const preset = getPreset(id);

  // Expose the real serializer to the export script's page.evaluate.
  useEffect(() => {
    window.__serializePoster = serializePoster;
  }, []);

  const fontsReady = useFontsReady(FONT_PROBES);
  const mounted = useHydrated();

  const template = getActiveTemplate(
    preset?.templateId ?? "vintage-cartography",
    preset?.vintageVariant ?? VINTAGE_VARIANT_ORDER[0],
  );

  const measured = useMeasuredLayout({
    home: preset?.home ?? null,
    places: preset?.places ?? [],
    units: preset?.units ?? "km",
    template,
    width: POSTER_W,
    height: POSTER_H,
    fontsReady,
    bearingMode: "great-circle",
    scaleByDistance: true,
  });

  // Guards run after all hooks so hook order is stable in every environment.
  if (process.env.NODE_ENV === "production" || !preset) notFound();

  const items = mounted ? measured : [];
  const ready = mounted && fontsReady && items.length === preset.places.length;

  return (
    <div
      data-poster-ready={ready ? "true" : "false"}
      style={{ width: POSTER_W, height: POSTER_H, background: "#fff" }}
    >
      <Poster
        home={preset.home}
        items={items}
        template={template}
        units={preset.units}
        width={POSTER_W}
        height={POSTER_H}
        title={preset.title}
        subtitle={preset.subtitle}
        footer={preset.footer}
      />
    </div>
  );
}

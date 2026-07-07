"use client";

import type { RefObject } from "react";
import { Poster } from "@/components/poster/Poster";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import { POSTER_SIZES } from "@/lib/templates/sizes";
import type { TemplateSpec } from "@/lib/templates/types";
import type { DisplayOptions } from "@/lib/templates/customize";
import type { BearingMode, Place, Units } from "@/lib/types";

/**
 * Off-screen bonus renders of the buyer's exact design: a phone (9:16) and a
 * desktop (16:9) wallpaper, captured at add-to-cart alongside the print/SVG
 * uploads (see PosterStudio.tsx's addToCart). Each size needs its own
 * useMeasuredLayout pass — the layout depends on the viewBox (collision-safe
 * radius, label wrap points), so a wallpaper can't just reuse the print's
 * already-resolved geometry.
 *
 * Mounted continuously (not created on click) so both are already laid out
 * and their <svg> exists by the time addToCart queries phoneRef/desktopRef —
 * measurement is synchronous (canvas text metrics via useMeasuredLayout), so
 * there's no async "settling" to wait for, only a render pass. Rendered
 * off-screen rather than `display:none` so nothing about this subtree (now or
 * later) depends on it ever being painted.
 */
export function WallpaperCapture({
  home,
  places,
  units,
  template,
  bearingMode,
  scaleByDistance,
  showDistances,
  fontsReady,
  title,
  subtitle,
  footer,
  display,
  phoneRef,
  desktopRef,
}: {
  home: Place | null;
  places: Place[];
  units: Units;
  template: TemplateSpec;
  bearingMode: BearingMode;
  scaleByDistance: boolean;
  showDistances: boolean;
  fontsReady: boolean;
  title: string | null;
  subtitle: string | null;
  footer: string | null;
  display: DisplayOptions;
  phoneRef: RefObject<HTMLDivElement | null>;
  desktopRef: RefObject<HTMLDivElement | null>;
}) {
  const phone = POSTER_SIZES.phone;
  const desktop = POSTER_SIZES.desktop;

  const phoneItems = useMeasuredLayout({
    home,
    places,
    units,
    template,
    width: phone.width,
    height: phone.height,
    fontsReady,
    bearingMode,
    scaleByDistance,
    showDistances,
  });
  const desktopItems = useMeasuredLayout({
    home,
    places,
    units,
    template,
    width: desktop.width,
    height: desktop.height,
    fontsReady,
    bearingMode,
    scaleByDistance,
    showDistances,
  });

  return (
    <div aria-hidden className="pointer-events-none fixed left-[-99999px] top-0 opacity-0">
      <div ref={phoneRef} data-testid="wallpaper-phone">
        <Poster
          home={home}
          items={phoneItems}
          template={template}
          units={units}
          width={phone.width}
          height={phone.height}
          title={title}
          subtitle={subtitle}
          footer={footer}
          display={display}
          idPrefix="pp-wallpaper-phone"
        />
      </div>
      <div ref={desktopRef} data-testid="wallpaper-desktop">
        <Poster
          home={home}
          items={desktopItems}
          template={template}
          units={units}
          width={desktop.width}
          height={desktop.height}
          title={title}
          subtitle={subtitle}
          footer={footer}
          display={display}
          idPrefix="pp-wallpaper-desktop"
        />
      </div>
    </div>
  );
}

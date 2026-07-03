"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Poster, POSTER_H, POSTER_W } from "@/components/poster/Poster";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import { getTemplate } from "@/lib/templates/registry";
import { quadToMatrix3d, type Quad } from "@/lib/mockup/perspective";
import type { Place } from "@/lib/types";

// Force the serif faces the celestial template uses to load before we
// measure, so labels never settle against the swap fallback.
const FONT_PROBES = ['500 40px "Fraunces"', '500 40px "EB Garamond"'];

// The room mockup (a moody green lounge: oak frame over a deep green wall,
// cognac leather chair and brass lamp below, shot straight-on) and its
// dimensions. The live poster is mapped onto the frame's print area. Generated
// with the frame interior solid black (scripts/scenes/PROMPTS.md), then
// squeezed horizontally so that black area is exactly 2:3; the quad below is
// its measured bounding box.
const ROOM_SRC = "/showcase/room-lounge.png";
const ROOM_W = 1203;
const ROOM_H = 816;

/**
 * Corners of the print area inside the frame, as fractions of the room image,
 * in [TL, TR, BR, BL] order. The frame is photographed straight-on, so the
 * quad is axis-aligned (measured with compose-scenes.ts' black-rect detection
 * against scene-room-raw.png, threshold lowered to 8 for the dark wall).
 */
const PRINT_QUAD: Quad = [
  [0.3516, 0.0748], // top-left
  [0.6492, 0.0748], // top-right
  [0.6492, 0.7316], // bottom-right
  [0.3516, 0.7316], // bottom-left
];

/**
 * The live "output" poster beside the globe, composited into a real room: the
 * bold-modern Pinprint poster for the SAME home + places that drive the globe, so
 * changing the home (the search widget) re-renders the poster on the wall. Mirrors
 * the /render/[id] route's measure pipeline; the Poster SVG is responsive (viewBox +
 * width/height=100%) and is warped (CSS matrix3d homography) onto the framed print so
 * it sits in the scene with correct perspective.
 */
export function LandingPoster({
  home,
  places,
}: {
  home: Place;
  places: Place[];
}) {
  const template = getTemplate("celestial");
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

  // Track the container's pixel size so we can map the print-area fractions to
  // pixels for the homography (mirrors the ResizeObserver pattern in GlobeDemo).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // matrix3d mapping the poster's native 1000×1500 box onto the framed print quad.
  const transform = useMemo(() => {
    if (size.width <= 0 || size.height <= 0) return undefined;
    const corners = PRINT_QUAD.map(
      ([fx, fy]) => [fx * size.width, fy * size.height] as [number, number],
    ) as Quad;
    return quadToMatrix3d(corners, POSTER_W, POSTER_H);
  }, [size]);

  const showPoster = mounted && transform != null;

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-[0_18px_50px_rgba(12,10,9,0.18)]"
      style={{ aspectRatio: `${ROOM_W} / ${ROOM_H}` }}
    >
      <Image
        src={ROOM_SRC}
        alt="A framed Pinprint piece hanging on a deep green wall above a leather armchair and a brass lamp"
        width={ROOM_W}
        height={ROOM_H}
        className="absolute inset-0 h-full w-full object-cover"
        sizes="(min-width: 768px) 520px, 90vw"
      />

      {showPoster && (
        // One warped "plate" (shares the matrix3d), isolated so the blend-mode
        // shading layers below tint ONLY the graphic, not the room photo behind it.
        // The stack bakes the room's real lighting onto the live print: warm paper
        // tone + a bottom-left-biased vignette, a diagonal glass glare matching the
        // window streak, and a frame inner-shadow — so it reads as printed-and-framed
        // rather than pasted on. Calibrated against the rectified photo reference.
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: POSTER_W,
            height: POSTER_H,
            transform,
            isolation: "isolate",
            // Frame/mat casting onto the print edges + a hairline so the edge reads.
            boxShadow:
              "inset 0 0 26px 7px rgba(22,16,10,0.17), 0 0 0 1px rgba(12,10,9,0.07)",
          }}
          aria-hidden
        >
          <Poster
            home={home}
            items={measured}
            template={template}
            units="km"
            width={POSTER_W}
            height={POSTER_H}
            title={home.label}
          />

          {/* 1 · Printed-paper tone + a vignette biased away from the lamp so
              the live SVG takes on the lounge's low evening light instead of
              reading screen-bright. */}
          <div
            className="absolute inset-0 mix-blend-multiply"
            style={{
              backgroundImage:
                "radial-gradient(125% 120% at 62% 62%, rgba(255,255,255,0) 50%, rgba(52,46,38,0.3) 100%), linear-gradient(#efe9dc, #efe9dc)",
            }}
          />

          {/* 2 · Warm brass-lamp glow catching the glass from the lower right. */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              backgroundImage:
                "linear-gradient(305deg, rgba(255,196,120,0.18) 0%, rgba(255,214,150,0.06) 26%, rgba(255,255,255,0) 50%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

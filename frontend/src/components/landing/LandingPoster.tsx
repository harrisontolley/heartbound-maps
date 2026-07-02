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

// Force the Archivo faces the bold-modern template uses to load before we
// measure, so labels never settle against the swap fallback.
const FONT_PROBES = ['700 40px "Archivo"', '800 40px "Archivo"'];

// The room mockup (an oak frame above a study desk, shot straight-on) and its
// dimensions. The live poster is mapped onto the frame's print area. Generated
// with the frame interior solid black (scripts/scenes/PROMPTS.md); the quad
// below is the measured bounding box of that black area.
const ROOM_SRC = "/showcase/room-study.png";
const ROOM_W = 1312;
const ROOM_H = 816;

/**
 * Corners of the print area inside the frame, as fractions of the room image,
 * in [TL, TR, BR, BL] order. The frame is photographed straight-on, so the
 * quad is axis-aligned (measured by scripts/compose-scenes.ts' black-rect
 * detection against scene-room-raw.png).
 */
const PRINT_QUAD: Quad = [
  [0.3986, 0.1789], // top-left
  [0.6014, 0.1789], // top-right
  [0.6014, 0.6458], // bottom-right
  [0.3986, 0.6458], // bottom-left
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
        alt="A framed Pinprint piece hanging above a study desk with a brass lamp"
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

          {/* 1 · Warm printed-paper tone + gentle vignette so the live SVG takes
              on the room's warm afternoon light instead of reading screen-white. */}
          <div
            className="absolute inset-0 mix-blend-multiply"
            style={{
              backgroundImage:
                "radial-gradient(120% 115% at 40% 35%, rgba(255,255,255,0) 55%, rgba(116,104,86,0.22) 100%), linear-gradient(#f1ead9, #f1ead9)",
            }}
          />

          {/* 2 · Faint glass sheen from the window at frame-left. */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              backgroundImage:
                "linear-gradient(105deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0) 45%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

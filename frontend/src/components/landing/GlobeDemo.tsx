"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { LandingPoster } from "./LandingPoster";
import { PlaceSearch } from "@/components/controls/PlaceSearch";
import { copy, STUDIO_HREF } from "./copy";
import { GLOBE_DEMO_HOME, GLOBE_DEMO_PLACES } from "@/lib/globe/demoData";
import type { GeoResult, Place } from "@/lib/types";

// react-globe.gl pulls in three.js and touches the DOM at import, so it must be
// client-only. dynamic(ssr:false) splits it into its own chunk; the in-view gate
// below means that chunk isn't fetched until the section nears the viewport.
const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-full bg-surface-strong/40" />
  ),
});

/**
 * The differentiator band: a "measured globe" that proves Pinprint computes the
 * exact bearing + great-circle distance from home to each place (the same numbers
 * it prints). Two columns on desktop — message + a "try it from your home town"
 * search on the left, globe on the right. The globe glides to frame the home then
 * holds still; searching a new home recomputes every reading live. Lazily
 * mounted and fully static under prefers-reduced-motion.
 */
export function GlobeDemo() {
  const { globe } = copy;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [home, setHome] = useState<Place>(GLOBE_DEMO_HOME);

  function handleSelectHome(r: GeoResult) {
    setHome({
      id: r.id,
      label: r.label,
      fullName: r.fullName,
      lat: r.lat,
      lng: r.lng,
      kind: r.kind,
      affiliation: "lived",
    });
  }

  // Mount the globe only when the section nears the viewport (protects LCP and
  // defers the three.js chunk fetch). One-shot.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Feed the wrapper's pixel size to the canvas (react-globe.gl needs numbers).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) {
        setSize({ width: Math.round(r.width), height: Math.round(r.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Honor prefers-reduced-motion, and react to live changes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const ready = inView && size.width > 0 && size.height > 0;

  return (
    <Section id="globe" orbs="preview">
      {/* Intro + the live "try it from your home" search. */}
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <SectionLabel>{globe.eyebrow}</SectionLabel>
        <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
          {globe.headline}
        </h2>
        <p className="text-[16px] leading-[1.5] tracking-[0.16px] text-body">
          {globe.body}
        </p>

        <div className="mt-2 w-full max-w-sm">
          <p className="mb-1.5 text-[13px] font-medium text-body-strong">
            {globe.tryLabel}
          </p>
          <PlaceSearch
            onSelect={handleSelectHome}
            placeholder="Search your home town…"
          />
          <p className="mt-2 text-[13px] text-muted">
            Measuring from{" "}
            <span className="font-medium text-body-strong">{home.label}</span>
            {home.id !== GLOBE_DEMO_HOME.id && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setHome(GLOBE_DEMO_HOME)}
                  className="underline underline-offset-2 transition-colors hover:text-body"
                >
                  reset
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* The measurement (globe) and its output (poster), both from the same
          home — change it above and watch both update. */}
      <div className="mt-12 grid items-center gap-8 md:grid-cols-2 md:gap-10">
        {/* Square box reserves height so the late mount causes no layout shift. */}
        <div
          ref={wrapRef}
          className="relative mx-auto aspect-square w-full max-w-[560px]"
          aria-hidden
        >
          {/* Soft contact shadow grounds the (transparent-background) globe. */}
          <div
            className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-[12%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(12,10,9,0.28),rgba(12,10,9,0)_70%)] blur-md"
            aria-hidden
          />
          {ready && (
            <GlobeScene
              width={size.width}
              height={size.height}
              reduceMotion={reduceMotion}
              home={home}
              places={GLOBE_DEMO_PLACES}
            />
          )}
        </div>

        <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-3">
          <p className="self-start text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
            {globe.posterLabel}
          </p>
          <LandingPoster home={home} places={GLOBE_DEMO_PLACES} />
          <Link
            href={STUDIO_HREF}
            className="text-[14px] font-medium text-ink underline underline-offset-4 transition-colors hover:text-body"
          >
            {globe.posterCta} →
          </Link>
        </div>
      </div>
    </Section>
  );
}

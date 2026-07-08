"use client";

import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { TextLink } from "@/components/ui/TextLink";
import { LandingPoster } from "./LandingPoster";
import { PlaceSearch } from "@/components/controls/PlaceSearch";
import { copy, STUDIO_HREF } from "./copy";
import { GLOBE_DEMO_HOME, GLOBE_DEMO_PLACES } from "@/lib/globe/demoData";
import { isWebGLAvailable } from "@/lib/globe/webgl";
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
 * Catches render-time crashes from the three.js scene (chunk failures, WebGL
 * context refusals that slip past the capability probe) so a broken globe can
 * never take the landing page down — the section collapses to the poster-only
 * layout instead.
 */
class GlobeErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * The comprehension beat: teaches a first-time visitor how to *read* a Heartbound Maps —
 * home at the center, an arrow in each place's true compass bearing, the
 * great-circle distance beside it (the same numbers it prints). A short decode
 * list spells that out; a "try it from your home town" search lets them measure
 * from their own home. Two columns on desktop — message + search on the left,
 * the live globe on the right, and the poster it produces below. The globe
 * glides to frame the home then holds still; searching a new home recomputes
 * every reading live. Lazily mounted and fully static under prefers-reduced-motion.
 */
export function GlobeDemo() {
  const { accuracy } = copy;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [home, setHome] = useState<Place>(GLOBE_DEMO_HOME);
  // null until the client-side probe runs (SSR markup renders the globe shell,
  // so hydration is stable); false collapses to the poster-only layout.
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [crashed, setCrashed] = useState(false);
  const showGlobe = webglOk !== false && !crashed;

  // Probe WebGL before the three.js chunk is ever fetched. Must run in an
  // effect: during render (or a state initializer) it would execute on the
  // server too and desync hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read of an external capability
    setWebglOk(isWebGLAvailable());
  }, []);

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

  const ready =
    showGlobe && webglOk === true && inView && size.width > 0 && size.height > 0;

  return (
    <Section id="accuracy">
      {/* Intro + the live "try it from your home" search. */}
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <SectionLabel>{accuracy.eyebrow}</SectionLabel>
        <h2 className="font-display text-heading font-normal text-ink">
          {accuracy.headline}
        </h2>
        {accuracy.body.map((para, i) => (
          <p key={i} className="text-copy text-body">
            {para}
          </p>
        ))}

        <dl className="mt-2 flex flex-col gap-3">
          {accuracy.annotations.map((a) => (
            <div key={a.term} className="flex items-baseline gap-3">
              <dt className="min-w-[5.5rem] shrink-0">
                <SectionLabel tone="accent">{a.term}</SectionLabel>
              </dt>
              <dd className="text-[15px] leading-[1.47] text-body">{a.def}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 max-w-[56ch] border-l-2 border-accent pl-4 text-[15px] leading-[1.55] text-body">
          {accuracy.fidelity}
        </p>

        <div className="mt-2 w-full max-w-sm">
          <p className="mb-1.5 text-[13px] font-medium text-body-strong">
            {accuracy.tryLabel}
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
                  className="underline underline-offset-2 transition-colors hover:text-body pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
                >
                  reset
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* The measurement (globe) and its output (poster), both from the same
          home — change it above and watch both update. Without WebGL (or after
          a globe crash) the poster column alone carries the section: it's live
          SVG off the same `home` state, so the try-it demo still works. */}
      <div
        className={`mt-12 grid items-center gap-8 md:gap-10 ${
          showGlobe ? "md:grid-cols-2" : ""
        }`}
      >
        {showGlobe && (
          /* Square box reserves height so the late mount causes no layout shift. */
          <div
            ref={wrapRef}
            className="relative mx-auto aspect-square w-full max-w-[560px] max-md:max-w-[min(72vw,400px)]"
            aria-hidden
          >
            {/* Soft contact shadow grounds the (transparent-background) globe. */}
            <div
              className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-[12%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(12,10,9,0.28),rgba(12,10,9,0)_70%)] blur-md"
              aria-hidden
            />
            {ready && (
              <GlobeErrorBoundary onError={() => setCrashed(true)}>
                <GlobeScene
                  width={size.width}
                  height={size.height}
                  reduceMotion={reduceMotion}
                  home={home}
                  places={GLOBE_DEMO_PLACES}
                />
              </GlobeErrorBoundary>
            )}
          </div>
        )}

        <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-3">
          <SectionLabel className="self-start">
            {accuracy.posterLabel}
          </SectionLabel>
          <LandingPoster home={home} places={GLOBE_DEMO_PLACES} />
          <TextLink href={STUDIO_HREF} size="sm">
            {accuracy.posterCta} →
          </TextLink>
        </div>
      </div>
    </Section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  MeshPhongMaterial,
} from "three";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { Place } from "@/lib/types";
import {
  buildGlobeData,
  formatReadout,
  type GlobeArc,
  type GlobePoint,
} from "@/lib/globe/arcs";

/**
 * The actual react-globe.gl (three.js) scene. This is the ONLY module that pulls
 * three.js into a bundle, so it is always loaded via dynamic(ssr:false) from
 * GlobeDemo — never imported on the server. Sizing + the (live-editable) home and
 * places are driven by the parent.
 *
 * Design: a "measured globe". Vector country outlines on a green/blue earth;
 * pulsing arcs from home to each place; and an on-brand HTML callout at each
 * destination showing the EXACT bearing + great-circle distance. It glides to
 * frame the home then holds still (no spin) so the readouts are legible; when the
 * home changes (the search widget), it recomputes and glides to the new home.
 */

// Earth palette: green land, blue ocean.
const OCEAN = "#3f6fa3"; // ocean blue
const LAND_FILL = "#5b9c6b"; // continent green
const LAND_SIDE = "rgba(40,80,50,0.25)"; // faint extruded edge
const BORDER = "#3a6b4f"; // darker green country lines

const POV_MS = 1200; // camera glide duration

/** Camera framing centered on the home (clamped off the poles). */
function homePov(home: Place) {
  return {
    lat: Math.max(-55, Math.min(70, home.lat)),
    lng: home.lng,
    altitude: 2.2,
  };
}

/** Natural Earth feature — only the fields we touch. */
type GeoFeature = { geometry: { type: string; coordinates: unknown } };

/**
 * Brand-styled DOM callout for a city: name + (for destinations) the exact
 * "51° NE · 5,570 km" readout. Inline-styled (not Tailwind classes) so it renders
 * reliably as a runtime-created node. react-globe overwrites the OUTER element's
 * transform every frame for positioning, so the float-above offset lives on the
 * inner chip; pointer-events are off so dragging the globe passes through.
 */
function buildCallout(p: GlobePoint): HTMLElement {
  const outer = document.createElement("div");
  outer.style.pointerEvents = "none";
  outer.style.opacity = "0"; // faded in by the visibility modifier
  outer.style.transition = "opacity .25s ease";

  const chip = document.createElement("div");
  chip.style.transform = "translateY(-135%)"; // float above the marker
  chip.style.display = "inline-flex";
  chip.style.flexDirection = "column";
  chip.style.alignItems = "flex-start";
  chip.style.gap = "1px";
  chip.style.padding = "5px 9px";
  chip.style.borderRadius = "10px";
  chip.style.border = "1px solid #e9e2d4"; // --color-hairline
  chip.style.background = "rgba(255,254,251,0.94)"; // --color-surface-card
  chip.style.boxShadow = "0 4px 14px rgba(31,27,22,0.16)";
  chip.style.fontFamily = "var(--font-inter), system-ui, sans-serif";
  chip.style.whiteSpace = "nowrap";

  const name = document.createElement("div");
  name.textContent = p.label;
  name.style.fontSize = "12px";
  name.style.fontWeight = "600";
  name.style.lineHeight = "1.2";
  name.style.color = "#1f1b16"; // --color-ink
  chip.appendChild(name);

  const sub = document.createElement("div");
  sub.style.fontSize = "11px";
  sub.style.lineHeight = "1.2";
  sub.style.color = "#857c6f"; // --color-muted
  if (
    !p.isHome &&
    p.bearingDeg != null &&
    p.compass != null &&
    p.distanceKm != null
  ) {
    sub.textContent = formatReadout({
      bearingDeg: p.bearingDeg,
      compass: p.compass,
      distanceKm: p.distanceKm,
    });
  } else {
    sub.textContent = "Home";
  }
  chip.appendChild(sub);

  outer.appendChild(chip);
  return outer;
}

type Props = {
  width: number;
  height: number;
  reduceMotion: boolean;
  home: Place;
  places: Place[];
};

export default function GlobeScene({
  width,
  height,
  reduceMotion,
  home,
  places,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const mountedRef = useRef(true);
  const [ready, setReady] = useState(false);
  const { arcs, points } = useMemo(
    () => buildGlobeData(home, places),
    [home, places],
  );

  // Guard async globe callbacks against StrictMode/HMR unmounts (dev only).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Solid ocean sphere; country polygons sit just above it. A cool specular
  // highlight + tighter shininess give the ocean a moving sheen under the
  // directional "sun" (set up once the globe is ready) rather than a flat fill.
  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: OCEAN,
        specular: new Color("#bcd8f0"),
        shininess: 22,
      }),
    [],
  );

  // Country outlines, fetched client-side (kept out of the initial chunk).
  const [countries, setCountries] = useState<object[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/globe/countries-110m.geojson")
      .then((r) => r.json())
      .then((geo) => {
        if (alive) setCountries(geo.features ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Replace react-globe's flat default lighting with a fixed-in-world "sun": a warm
  // directional light from the upper-left plus a softer ambient fill, so the sphere
  // gets a real day/night terminator and the ocean sheen reads. World-space (added to
  // the scene, not the camera) so the shaded side stays put as the globe glides.
  useEffect(() => {
    if (!ready) return;
    const g = globeRef.current;
    if (!g) return;
    const ambient = new AmbientLight(0xffffff, 0.6);
    const sun = new DirectionalLight(0xfff4e6, 2.1);
    sun.position.set(-1.4, 0.9, 1.6);
    g.lights([ambient, sun]);
  }, [ready]);

  // Frame the home and hold — glides in on reveal and to the new home whenever it
  // changes (the search widget). No perpetual auto-rotate; drag stays enabled.
  // Reduced motion jumps instantly.
  useEffect(() => {
    if (!ready) return;
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    g.pointOfView(homePov(home), reduceMotion ? 0 : POV_MS);
  }, [ready, home, reduceMotion]);

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={null}
      globeMaterial={globeMaterial}
      showAtmosphere
      atmosphereColor="#a9cdec"
      atmosphereAltitude={0.2}
      onGlobeReady={() => {
        // react-globe fires this synchronously during render; a microtask still
        // lands before the mount commit, so defer with a macrotask.
        setTimeout(() => {
          if (mountedRef.current) setReady(true);
        }, 0);
      }}
      // Country outlines.
      polygonsData={countries}
      polygonGeoJsonGeometry={(d: object) => (d as GeoFeature).geometry as never}
      polygonCapColor={() => LAND_FILL}
      polygonSideColor={() => LAND_SIDE}
      polygonStrokeColor={() => BORDER}
      polygonAltitude={0.012}
      polygonsTransitionDuration={0}
      // Arcs: home -> each place, gradient-colored home-ink -> affiliation,
      // pulsing continuously (solid under reduced motion).
      arcsData={arcs}
      arcStartLat={(d) => (d as GlobeArc).startLat}
      arcStartLng={(d) => (d as GlobeArc).startLng}
      arcEndLat={(d) => (d as GlobeArc).endLat}
      arcEndLng={(d) => (d as GlobeArc).endLng}
      arcColor={(d: object) => (d as GlobeArc).color}
      arcLabel={(d) => (d as GlobeArc).label}
      arcStroke={0.6}
      arcAltitudeAutoScale={0.35}
      arcDashLength={reduceMotion ? 1 : 0.5}
      arcDashGap={reduceMotion ? 0 : 0.25}
      arcDashAnimateTime={reduceMotion ? 0 : 2000}
      // City markers.
      pointsData={points}
      pointLat={(d) => (d as GlobePoint).lat}
      pointLng={(d) => (d as GlobePoint).lng}
      pointColor={(d) => (d as GlobePoint).color}
      pointRadius={(d) => ((d as GlobePoint).isHome ? 0.9 : 0.65)}
      pointAltitude={0.03}
      pointLabel={(d) => (d as GlobePoint).label}
      // Bearing + distance callouts (brand HTML chips at each city).
      htmlElementsData={ready ? points : []}
      htmlLat={(d) => (d as GlobePoint).lat}
      htmlLng={(d) => (d as GlobePoint).lng}
      htmlAltitude={0.04}
      htmlElement={(d) => buildCallout(d as GlobePoint)}
      htmlElementVisibilityModifier={(el, isVisible) => {
        (el as HTMLElement).style.opacity = isVisible ? "1" : "0";
      }}
    />
  );
}

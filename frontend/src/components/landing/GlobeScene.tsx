"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
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
 * Design: a "measured globe". Vector country outlines on a neutral sphere; arcs
 * from home to each place with chevron arrowheads; and an on-brand HTML callout
 * at each destination showing the EXACT bearing + great-circle distance. It
 * glides to frame the home then holds still so the readouts are legible; when the
 * home changes (the search widget), it recomputes and glides to the new home.
 */

// Brand palette (globals.css @theme): neutral stone globe so the pastel orbs
// behind and the affiliation-colored arcs carry the color.
const OCEAN = "#d6d3d1"; // --color-hairline-strong
const LAND_FILL = "#ffffff"; // --color-surface-card
const LAND_SIDE = "rgba(120,113,108,0.18)"; // muted, faint extrusion edge
const BORDER = "#a8a29e"; // --color-muted-soft

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

// A flat ">" chevron pointing toward +x (the direction of travel), built once
// and shared by every arrowhead; each arc clones it with its own color/transform.
function buildChevronGeometry(): ShapeGeometry {
  const s = new Shape();
  s.moveTo(0, 0); // apex (tip)
  s.lineTo(-1, 0.8); // upper outer
  s.lineTo(-0.55, 0.8); // upper end cap
  s.lineTo(-0.2, 0); // inner notch — keeps it an open chevron, not a triangle
  s.lineTo(-0.55, -0.8); // lower end cap
  s.lineTo(-1, -0.8); // lower outer
  s.lineTo(0, 0);
  return new ShapeGeometry(s);
}
const CHEVRON_GEOMETRY = buildChevronGeometry();
const CHEVRON_SCALE = 0.075; // fraction of the globe radius
const CHEVRON_ALT = 1.03; // radius multiplier — sits just above the surface

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
  chip.style.border = "1px solid #e7e5e4";
  chip.style.background = "rgba(255,255,255,0.92)";
  chip.style.boxShadow = "0 4px 14px rgba(12,10,9,0.10)";
  chip.style.fontFamily = "var(--font-inter), system-ui, sans-serif";
  chip.style.whiteSpace = "nowrap";

  const name = document.createElement("div");
  name.textContent = p.label;
  name.style.fontSize = "12px";
  name.style.fontWeight = "600";
  name.style.lineHeight = "1.2";
  name.style.color = "#0c0a09"; // --color-ink
  chip.appendChild(name);

  const sub = document.createElement("div");
  sub.style.fontSize = "11px";
  sub.style.lineHeight = "1.2";
  sub.style.color = "#777169"; // --color-muted
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
  const [settled, setSettled] = useState(false);
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

  // Solid ocean sphere; country polygons sit just above it.
  const globeMaterial = useMemo(
    () => new MeshPhongMaterial({ color: OCEAN, shininess: 6 }),
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

  // Let the arcs march on briefly, then freeze solid. Skipped under reduced
  // motion (arcs render solid from the start) and not re-run on home changes.
  useEffect(() => {
    if (!ready || reduceMotion) return;
    const t = window.setTimeout(() => setSettled(true), POV_MS + 600);
    return () => window.clearTimeout(t);
  }, [ready, reduceMotion]);

  // Chevron arrowheads as a custom three.js layer: one flat chevron at each
  // arc's destination, oriented along the great-circle bearing (direction of
  // travel) so it reads as an arrow arriving at the city.
  const makeChevron = (d: object) => {
    const a = d as GlobeArc;
    return new Mesh(
      CHEVRON_GEOMETRY,
      new MeshBasicMaterial({ color: a.color[1], side: DoubleSide }),
    );
  };

  const placeChevron = (obj: object, d: object) => {
    const g = globeRef.current;
    if (!g) return;
    const a = d as GlobeArc;
    const mesh = obj as Mesh;
    const R = g.getGlobeRadius();
    const ec = g.getCoords(a.endLat, a.endLng, 0);
    const sc = g.getCoords(a.startLat, a.startLng, 0);
    const end = new Vector3(ec.x, ec.y, ec.z).normalize();
    const start = new Vector3(sc.x, sc.y, sc.z).normalize();
    // Tangent at the destination, pointing in the direction of travel.
    const planeN = new Vector3().crossVectors(start, end).normalize();
    const forward = new Vector3().crossVectors(planeN, end).normalize();
    const side = new Vector3().crossVectors(end, forward).normalize();
    mesh.quaternion.setFromRotationMatrix(
      new Matrix4().makeBasis(forward, side, end),
    );
    mesh.scale.setScalar(R * CHEVRON_SCALE);
    mesh.position.copy(end.multiplyScalar(R * CHEVRON_ALT));
  };

  // Arcs march on during the intro, then hold solid.
  const arcsAnimating = !reduceMotion && !settled;

  return (
    <Globe
      ref={globeRef}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={null}
      globeMaterial={globeMaterial}
      showAtmosphere
      atmosphereColor="#cfcbc6"
      atmosphereAltitude={0.2}
      onGlobeReady={() => {
        if (mountedRef.current) setReady(true);
      }}
      // Country outlines.
      polygonsData={countries}
      polygonGeoJsonGeometry={(d: object) => (d as GeoFeature).geometry as never}
      polygonCapColor={() => LAND_FILL}
      polygonSideColor={() => LAND_SIDE}
      polygonStrokeColor={() => BORDER}
      polygonAltitude={0.012}
      polygonsTransitionDuration={0}
      // Arcs: home -> each place, gradient-colored home-ink -> affiliation.
      arcsData={arcs}
      arcStartLat={(d) => (d as GlobeArc).startLat}
      arcStartLng={(d) => (d as GlobeArc).startLng}
      arcEndLat={(d) => (d as GlobeArc).endLat}
      arcEndLng={(d) => (d as GlobeArc).endLng}
      arcColor={(d: object) => (d as GlobeArc).color}
      arcLabel={(d) => (d as GlobeArc).label}
      arcStroke={0.55}
      arcAltitudeAutoScale={0.35}
      arcDashLength={arcsAnimating ? 0.5 : 1}
      arcDashGap={arcsAnimating ? 0.22 : 0}
      arcDashAnimateTime={arcsAnimating ? 2200 : 0}
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
      // Chevron arrowheads at each destination (built once the globe is ready).
      customLayerData={ready ? arcs : []}
      customThreeObject={makeChevron}
      customThreeObjectUpdate={placeChevron}
    />
  );
}

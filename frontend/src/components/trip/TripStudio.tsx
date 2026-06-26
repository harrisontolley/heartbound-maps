"use client";

import { useMemo, useRef, useState } from "react";
import { useTripStore } from "@/lib/trip/tripStore";
import { buildProjection } from "@/lib/geo/worldProjection";
import { buildArcPath } from "@/lib/trip/arc";
import { landPathData } from "@/lib/trip/land";
import { TripMap, TRIP_W, TRIP_H } from "@/components/trip/TripMap";
import { PlaceSearch } from "@/components/controls/PlaceSearch";
import { Button } from "@/components/ui/Button";
import { exportSvg, exportPng, slugify } from "@/lib/export";
import type { ProjectionMode, RouteStyle } from "@/lib/trip/types";

const VIEW = { width: TRIP_W, height: TRIP_H };
const ARC_CURVATURE = 0.18;

/**
 * Trip-map playground: build an ordered itinerary on the left, watch it draw on
 * a dotted world map on the right, toggle the look, and export. Isolated from
 * the radial-bearing `/studio` editor — it shares only the geocode search, the
 * export pipeline, and the design tokens.
 */
export function TripStudio() {
  const stops = useTripStore((s) => s.stops);
  const loopHome = useTripStore((s) => s.loopHome);
  const showBackdrop = useTripStore((s) => s.showBackdrop);
  const routeStyle = useTripStore((s) => s.routeStyle);
  const projection = useTripStore((s) => s.projection);

  const addStop = useTripStore((s) => s.addStop);
  const removeStop = useTripStore((s) => s.removeStop);
  const moveStop = useTripStore((s) => s.moveStop);
  const setLabel = useTripStore((s) => s.setLabel);
  const setLoopHome = useTripStore((s) => s.setLoopHome);
  const setShowBackdrop = useTripStore((s) => s.setShowBackdrop);
  const setRouteStyle = useTripStore((s) => s.setRouteStyle);
  const setProjection = useTripStore((s) => s.setProjection);
  const loadSeed = useTripStore((s) => s.loadSeed);
  const clear = useTripStore((s) => s.clear);

  const proj = useMemo(() => buildProjection(stops, projection, VIEW), [stops, projection]);

  const landPath = useMemo(
    () => (showBackdrop ? landPathData(proj.project) : null),
    [showBackdrop, proj],
  );

  const legs = useMemo(() => {
    const curvature = routeStyle === "arc" ? ARC_CURVATURE : 0;
    const out: string[] = [];
    const pts = proj.points;
    for (let i = 0; i < pts.length - 1; i++) {
      out.push(buildArcPath(pts[i], pts[i + 1], curvature));
    }
    if (loopHome && pts.length > 1) {
      out.push(buildArcPath(pts[pts.length - 1], pts[0], curvature));
    }
    return out;
  }, [proj, routeStyle, loopHome]);

  const title =
    stops.length > 1
      ? `${stops[0].label} → ${stops[stops.length - 1].label}`
      : (stops[0]?.label ?? null);

  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<null | "svg" | "png">(null);

  async function download(kind: "svg" | "png") {
    const svg = posterRef.current?.querySelector("svg");
    if (!svg) return;
    const name = `pinprint-trip-${slugify(stops[0]?.label ?? "map")}.${kind}`;
    setExporting(kind);
    try {
      if (kind === "svg") await exportSvg(svg, name);
      else await exportPng(svg, name);
    } catch {
      // Export rarely fails; leave buttons enabled for a retry.
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:h-screen lg:flex-row">
      {/* Itinerary + controls */}
      <aside className="flex w-full flex-col gap-6 border-b border-hairline bg-surface-card p-5 lg:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div>
          <h1 className="font-display text-2xl text-ink">Trip map</h1>
          <p className="mt-1 text-sm text-muted">
            Build an itinerary; the route draws in order on a world map.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <Heading>Add a stop</Heading>
          <PlaceSearch onSelect={(r) => addStop(r)} placeholder="Search a city…" />
        </section>

        <section className="flex flex-col gap-2">
          <Heading>Itinerary</Heading>
          <ol className="flex flex-col gap-1.5">
            {stops.map((stop, i) => (
              <li
                key={stop.id}
                className="flex items-center gap-2 rounded-md border border-hairline-soft bg-canvas-soft px-2 py-1.5"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  {i + 1}
                </span>
                <input
                  value={stop.label}
                  onChange={(e) => setLabel(stop.id, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                  aria-label={`Stop ${i + 1} label`}
                />
                <div className="flex items-center gap-0.5 text-muted">
                  <IconButton
                    label="Move up"
                    disabled={i === 0}
                    onClick={() => moveStop(stop.id, "up")}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={i === stops.length - 1}
                    onClick={() => moveStop(stop.id, "down")}
                  >
                    ↓
                  </IconButton>
                  <IconButton label="Remove" onClick={() => removeStop(stop.id)}>
                    ✕
                  </IconButton>
                </div>
              </li>
            ))}
            {stops.length === 0 && (
              <li className="rounded-md border border-dashed border-hairline px-3 py-4 text-center text-sm text-muted">
                No stops yet — search above to add one.
              </li>
            )}
          </ol>
          <div className="mt-1 flex gap-3 text-xs text-muted">
            <button type="button" className="hover:text-ink" onClick={loadSeed}>
              Load example
            </button>
            <button type="button" className="hover:text-ink" onClick={clear}>
              Clear all
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Heading>Design</Heading>
          <Segmented
            label="Route"
            value={routeStyle}
            options={[
              { value: "arc", label: "Curved" },
              { value: "straight", label: "Straight" },
            ]}
            onChange={(v) => setRouteStyle(v as RouteStyle)}
          />
          <Segmented
            label="Map"
            value={projection}
            options={[
              { value: "world", label: "Whole world" },
              { value: "fit", label: "Fit to trip" },
            ]}
            onChange={(v) => setProjection(v as ProjectionMode)}
          />
          <Check label="Dotted continents" checked={showBackdrop} onChange={setShowBackdrop} />
          <Check label="Loop back to start" checked={loopHome} onChange={setLoopHome} />
        </section>

        <section className="mt-auto flex gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            disabled={!stops.length || exporting !== null}
            onClick={() => download("png")}
          >
            {exporting === "png" ? "Exporting…" : "Download PNG"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!stops.length || exporting !== null}
            onClick={() => download("svg")}
          >
            SVG
          </Button>
        </section>
      </aside>

      {/* Live preview */}
      <main className="flex flex-1 items-center justify-center p-5 lg:overflow-auto">
        <div
          ref={posterRef}
          className="w-full max-w-5xl overflow-hidden rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
          style={{ aspectRatio: `${TRIP_W} / ${TRIP_H}` }}
        >
          <TripMap
            stops={stops}
            points={proj.points}
            landPath={landPath}
            legs={legs}
            title={title}
          />
        </div>
      </main>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
      {children}
    </h2>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded text-sm transition-colors hover:bg-surface-strong hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex rounded-pill border border-hairline-strong p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-pill px-3 py-1 text-xs transition-colors ${
              value === o.value
                ? "bg-primary text-on-primary"
                : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  );
}

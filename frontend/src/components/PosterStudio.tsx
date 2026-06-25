"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePosterStore } from "@/lib/store/posterStore";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import {
  getActiveTemplate,
  TEMPLATE_ORDER,
  TEMPLATES,
} from "@/lib/templates/registry";
import {
  VINTAGE_VARIANT_ORDER,
  VINTAGE_VARIANT_LABELS,
} from "@/lib/templates/vintageVariants";
import { resolveCustomized } from "@/lib/templates/customize";
import { POSTER_SIZES } from "@/lib/templates/sizes";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";
import { Poster } from "@/components/poster/Poster";
import { PlaceSearch } from "@/components/controls/PlaceSearch";
import { PlaceList } from "@/components/controls/PlaceList";
import { CustomizePanel } from "@/components/controls/CustomizePanel";
import { Button } from "@/components/ui/Button";
import { PillButton } from "@/components/ui/PillButton";
import { GradientOrbs } from "@/components/ui/GradientOrbs";
import { exportSvg, exportPng, slugify } from "@/lib/export";
import type { GeoResult } from "@/lib/types";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-surface-strong" />
  ),
});

export function PosterStudio() {
  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);
  const units = usePosterStore((s) => s.units);
  const templateId = usePosterStore((s) => s.templateId);
  const setTemplate = usePosterStore((s) => s.setTemplate);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const setVintageVariant = usePosterStore((s) => s.setVintageVariant);
  const toggleUnits = usePosterStore((s) => s.toggleUnits);
  const bearingMode = usePosterStore((s) => s.bearingMode);
  const setBearingMode = usePosterStore((s) => s.setBearingMode);
  const addFromGeo = usePosterStore((s) => s.addFromGeo);
  const sizeId = usePosterStore((s) => s.sizeId);
  const customization = usePosterStore((s) => s.customization);

  const base = getActiveTemplate(templateId, vintageVariant);
  const { template, display, text } = useMemo(
    () => resolveCustomized(base, customization),
    [base, customization],
  );
  const { width, height } = POSTER_SIZES[sizeId];
  const fontsReady = useFontsReady();

  const mounted = useHydrated();
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<null | "svg" | "png">(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tpl = params.get("template");
    if (tpl && (TEMPLATE_ORDER as string[]).includes(tpl)) {
      setTemplate(tpl as TemplateId);
    }
    const variant = params.get("variant");
    if (variant && (VINTAGE_VARIANT_ORDER as string[]).includes(variant)) {
      setVintageVariant(variant as VintageVariant);
    }
  }, [setTemplate, setVintageVariant]);

  function getSvg(): SVGSVGElement | null {
    return posterRef.current?.querySelector("svg") ?? null;
  }

  async function handleDownload(kind: "svg" | "png") {
    const svg = getSvg();
    if (!svg) return;
    const name = `pinprint-${slugify(home?.label ?? "poster")}.${kind}`;
    setExporting(kind);
    try {
      if (kind === "svg") await exportSvg(svg, name);
      else await exportPng(svg, name);
    } catch {
      flash("Export failed — try again");
    } finally {
      setExporting(null);
    }
  }

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2600);
  }

  function handleSelect(r: GeoResult) {
    const result = addFromGeo(r);
    if (result === "duplicate") flash(`${r.label} is already on your map`);
    else if (result === "home") flash(`${r.label} set as home`);
  }

  const measured = useMeasuredLayout({
    home,
    places,
    units,
    template,
    width,
    height,
    fontsReady,
    bearingMode,
  });
  const items = mounted ? measured : [];

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="relative overflow-hidden border-b border-hairline bg-canvas">
        <GradientOrbs preset="header" />
        <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl leading-none text-ink">
              Pinprint
            </h1>
            <span className="hidden text-sm text-muted sm:inline">
              poster maps of the places that matter
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1"
              title="How each arrow's direction & distance are computed"
            >
              {(
                [
                  [
                    "great-circle",
                    "Direct",
                    "Great-circle: the true shortest-path bearing & distance",
                  ],
                  [
                    "rhumb",
                    "Map",
                    "Rhumb line: constant-heading bearing & distance — matches a flat map",
                  ],
                ] as const
              ).map(([mode, label, hint]) => (
                <PillButton
                  key={mode}
                  active={bearingMode === mode}
                  onClick={() => bearingMode !== mode && setBearingMode(mode)}
                  title={hint}
                >
                  {label}
                </PillButton>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(["km", "mi"] as const).map((u) => (
                <PillButton
                  key={u}
                  active={units === u}
                  onClick={() => units !== u && toggleUnits()}
                >
                  {u}
                </PillButton>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => handleDownload("svg")}
              disabled={exporting !== null || !home}
            >
              {exporting === "svg" ? "…" : "SVG"}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleDownload("png")}
              disabled={exporting !== null || !home}
            >
              {exporting === "png" ? "Rendering…" : "Download PNG"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Controls */}
        <aside className="relative flex w-full shrink-0 flex-col overflow-y-auto border-hairline bg-canvas-soft p-4 lg:w-[360px] lg:border-r">
          <GradientOrbs preset="sidebar" />
          <div className="relative z-10 flex flex-col gap-4">
            <div>
              <PlaceSearch onSelect={handleSelect} />
              {notice && <p className="mt-2 text-xs text-muted">{notice}</p>}
            </div>

            <PlaceList />

            <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="h-56 w-full">
                <MapPicker />
              </div>
              <p className="bg-surface-strong px-2.5 py-1.5 text-[11px] text-muted">
                Click the map to drop a place · © OpenStreetMap contributors
              </p>
            </div>

            <CustomizePanel />
          </div>
        </aside>

        {/* Preview */}
        <main className="flex min-h-0 flex-1 flex-col bg-canvas">
          <div className="relative z-10 border-b border-hairline bg-canvas-soft">
            <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5">
              {TEMPLATE_ORDER.map((id) => (
                <PillButton
                  key={id}
                  active={id === templateId}
                  onClick={() => setTemplate(id)}
                >
                  {TEMPLATES[id].name}
                </PillButton>
              ))}
            </div>
            {templateId === "vintage-cartography" && (
              <div className="flex items-center gap-2 border-t border-hairline-soft px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Style
                </span>
                {VINTAGE_VARIANT_ORDER.map((v) => (
                  <PillButton
                    key={v}
                    active={v === vintageVariant}
                    size="sm"
                    onClick={() => setVintageVariant(v)}
                  >
                    {VINTAGE_VARIANT_LABELS[v]}
                  </PillButton>
                ))}
                <span className="ml-1 hidden text-xs text-muted sm:inline">
                  — pick your favourite
                </span>
              </div>
            )}
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-auto p-6">
            <GradientOrbs preset="preview" />
            <div
              ref={posterRef}
              className="relative z-10 h-full max-h-[calc(100vh-160px)] max-w-full overflow-hidden rounded-sm bg-surface-card shadow-2xl"
              style={{ aspectRatio: `${width} / ${height}` }}
            >
              <Poster
                home={home}
                items={items}
                template={template}
                units={units}
                width={width}
                height={height}
                title={text.title}
                subtitle={text.subtitle}
                footer={text.footer}
                display={display}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

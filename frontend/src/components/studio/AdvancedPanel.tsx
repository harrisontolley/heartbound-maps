"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { getActiveTemplate } from "@/lib/templates/registry";
import {
  VINTAGE_VARIANT_ORDER,
  VINTAGE_VARIANT_LABELS,
} from "@/lib/templates/vintageVariants";
import {
  COLORWAYS,
  CUSTOM_COLORWAY_ID,
  ORIGINAL_COLORWAY_ID,
} from "@/lib/templates/colorways";
import { FONT_PRESETS } from "@/lib/templates/fontPresets";
import { AFFILIATIONS, AFFILIATION_ORDER } from "@/lib/affiliations";
import type { Customization } from "@/lib/templates/customize";
import type { Affiliation } from "@/lib/types";
import type { RoseStyle } from "@/lib/templates/types";
import { PillButton } from "@/components/ui/PillButton";
import { Button } from "@/components/ui/Button";
import { DisclosureSection } from "@/components/ui/DisclosureSection";

// The "Make it yours" panel. Two high-impact levers stay in view — Colour
// (curated colorways + a custom escape hatch) and Type (font pairings) — and
// everything finer tucks into collapsed sections, so the first glance stays
// calm. All controls write the store, so the live preview updates instantly.

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
      {children}
    </h3>
  );
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | null;
  fallback: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-body">{label}</span>
      <div className="flex items-center gap-1.5">
        {value && (
          <button
            onClick={() => onChange(null)}
            className="cursor-pointer text-[10px] text-muted transition-colors hover:text-ink"
          >
            reset
          </button>
        )}
        <input
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-6 w-9 cursor-pointer rounded-sm border border-hairline-strong bg-surface-card p-0.5"
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded-xs border-hairline-strong accent-ink"
      />
      {label}
    </label>
  );
}

function TextRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 w-full rounded-md border border-hairline-strong bg-surface-card px-2.5 py-1.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-ink focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

const TILE_RING =
  "rounded-lg p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const tileTone = (selected: boolean) =>
  selected
    ? "ring-2 ring-ink ring-offset-1 ring-offset-canvas-soft"
    : "ring-1 ring-hairline-strong hover:ring-muted-soft";

/** A colorway swatch: paper field with ink + accent dots, name underneath. */
function ColorwayChip({
  name,
  paper,
  ink,
  accent,
  selected,
  onClick,
}: {
  name: string;
  paper: string;
  ink: string;
  accent: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${name} colours`}
      onClick={onClick}
      className={`${TILE_RING} ${tileTone(selected)}`}
    >
      <span
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-black/5"
        style={{ background: paper }}
      >
        <span className="h-3 w-3 rounded-full" style={{ background: ink }} />
        <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
      </span>
      <span className="mt-1.5 block truncate text-[10px] font-medium text-body">
        {name}
      </span>
    </button>
  );
}

/** A font-pairing tile: a live "Aa" specimen + the pairing's name and families. */
function FontTile({
  name,
  hint,
  titleFamily,
  nameFamily,
  selected,
  onClick,
}: {
  name: string;
  hint: string;
  titleFamily: string;
  nameFamily: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${name} type: ${hint}`}
      onClick={onClick}
      className={`${TILE_RING} ${tileTone(selected)}`}
    >
      <span
        className="block text-2xl leading-none text-ink"
        style={{ fontFamily: titleFamily }}
      >
        Aa
      </span>
      <span
        className="mt-1.5 block truncate text-[11px] font-medium text-ink"
        style={{ fontFamily: nameFamily }}
      >
        {name}
      </span>
    </button>
  );
}

const ROSE_OPTIONS: { id: RoseStyle; label: string; title: string }[] = [
  { id: "none", label: "Off", title: "No compass rose" },
  { id: "tick", label: "Minimal", title: "A single faint guide ring" },
  { id: "ornate", label: "Ornate", title: "Faceted compass with cardinal points" },
  { id: "starburst", label: "Starburst", title: "Radiating night-sky rays" },
  { id: "crosshair", label: "Crosshair", title: "Technical degree-tick ring + crosshair" },
  { id: "deco", label: "Deco", title: "Art-deco stepped sunburst" },
];

export function AdvancedPanel() {
  const templateId = usePosterStore((s) => s.templateId);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const setVintageVariant = usePosterStore((s) => s.setVintageVariant);
  const home = usePosterStore((s) => s.home);
  const bearingMode = usePosterStore((s) => s.bearingMode);
  const setBearingMode = usePosterStore((s) => s.setBearingMode);
  const units = usePosterStore((s) => s.units);
  const setUnits = usePosterStore((s) => s.setUnits);
  const c = usePosterStore((s) => s.customization);
  const setC = usePosterStore((s) => s.setCustomization);
  const resetCustomization = usePosterStore((s) => s.resetCustomization);

  const base = getActiveTemplate(templateId, vintageVariant);
  const set = (patch: Partial<Customization>) => setC(patch);

  // ---- Colour ----
  const selectedColorway = c.colorwayId ?? ORIGINAL_COLORWAY_ID;
  const effectivePaper = c.paperOverride ?? base.paper;
  const effectiveInk = c.inkOverride ?? base.ink;
  const effectiveAccent = c.accentOverride ?? base.accent;
  const selectOriginal = () =>
    set({
      colorwayId: ORIGINAL_COLORWAY_ID,
      paperOverride: null,
      inkOverride: null,
      accentOverride: null,
    });
  const setCustomColor = (patch: Partial<Customization>) =>
    set({ ...patch, colorwayId: CUSTOM_COLORWAY_ID });

  // ---- Type ----
  const selectedFont = c.fontPresetId; // null = the look's own fonts

  // ---- Compass ----
  const currentRose: RoseStyle = c.roseStyle ?? base.rose;
  const roseLabel =
    ROSE_OPTIONS.find((r) => r.id === currentRose)?.label ?? "Custom";

  // ---- Per-affiliation colour ----
  const setAffiliationColor = (aff: Affiliation, v: string | null) => {
    const next = { ...c.affiliationColors };
    if (v) next[aff] = v;
    else delete next[aff];
    set({ affiliationColors: next });
  };

  const coordsPlaceholder = home
    ? `${Math.abs(home.lat).toFixed(2)}°${home.lat >= 0 ? "N" : "S"} · ${Math.abs(home.lng).toFixed(2)}°${home.lng >= 0 ? "E" : "W"}`
    : "Latitude · Longitude";

  return (
    <div className="flex flex-col">
      {/* Colour — primary lever */}
      <section className="flex flex-col gap-2.5 border-b border-hairline pb-5">
        <Heading>Colour</Heading>
        <div className="grid grid-cols-3 gap-2">
          <ColorwayChip
            name="Original"
            paper={base.paper}
            ink={base.ink}
            accent={base.accent}
            selected={selectedColorway === ORIGINAL_COLORWAY_ID}
            onClick={selectOriginal}
          />
          {COLORWAYS.map((cw) => (
            <ColorwayChip
              key={cw.id}
              name={cw.name}
              paper={cw.paper}
              ink={cw.ink}
              accent={cw.accent}
              selected={selectedColorway === cw.id}
              onClick={() =>
                set({
                  colorwayId: cw.id,
                  paperOverride: cw.paper,
                  inkOverride: cw.ink,
                  accentOverride: cw.accent,
                })
              }
            />
          ))}
          <ColorwayChip
            name="Custom"
            paper={effectivePaper}
            ink={effectiveInk}
            accent={effectiveAccent}
            selected={selectedColorway === CUSTOM_COLORWAY_ID}
            onClick={() => set({ colorwayId: CUSTOM_COLORWAY_ID })}
          />
        </div>
        {selectedColorway === CUSTOM_COLORWAY_ID && (
          <div className="flex flex-col gap-2 rounded-md bg-surface-strong/60 p-3">
            <ColorRow
              label="Paper"
              value={c.paperOverride}
              fallback={base.paper}
              onChange={(v) => setCustomColor({ paperOverride: v })}
            />
            <ColorRow
              label="Ink"
              value={c.inkOverride}
              fallback={base.ink}
              onChange={(v) => setCustomColor({ inkOverride: v })}
            />
            <ColorRow
              label="Accent"
              value={c.accentOverride}
              fallback={base.accent}
              onChange={(v) => setCustomColor({ accentOverride: v })}
            />
          </div>
        )}
      </section>

      {/* Type — primary lever */}
      <section className="flex flex-col gap-2.5 border-b border-hairline py-5">
        <Heading>Type</Heading>
        <div className="grid grid-cols-3 gap-2">
          <FontTile
            name="Original"
            hint="the look's own"
            titleFamily={base.titleFamily}
            nameFamily={base.nameFamily}
            selected={selectedFont == null}
            onClick={() => set({ fontPresetId: null })}
          />
          {FONT_PRESETS.map((fp) => (
            <FontTile
              key={fp.id}
              name={fp.name}
              hint={fp.hint}
              titleFamily={fp.titleFamily}
              nameFamily={fp.nameFamily}
              selected={selectedFont === fp.id}
              onClick={() => set({ fontPresetId: fp.id })}
            />
          ))}
        </div>
      </section>

      {/* Compass & decoration */}
      <DisclosureSection title="Compass & decoration" accessory={roseLabel} defaultOpen>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {ROSE_OPTIONS.map((r) => (
              <PillButton
                key={r.id}
                size="sm"
                active={currentRose === r.id}
                title={r.title}
                onClick={() => set({ roseStyle: r.id })}
              >
                {r.label}
              </PillButton>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <Toggle
              label="Border"
              checked={c.borderOn ?? base.border !== null}
              onChange={(v) => set({ borderOn: v })}
            />
            <Toggle
              label="Paper texture"
              checked={c.textureOn ?? base.texture}
              onChange={(v) => set({ textureOn: v })}
            />
            <Toggle
              label="Ring guides"
              checked={c.ringGuidesOn ?? base.ringGuides}
              onChange={(v) => set({ ringGuidesOn: v })}
            />
            <Toggle
              label="Scale arrows by distance"
              checked={c.scaleArrowsByDistance}
              onChange={(v) => set({ scaleArrowsByDistance: v })}
            />
          </div>
        </div>
      </DisclosureSection>

      {/* Text */}
      <DisclosureSection title="Text">
        <div className="flex flex-col gap-2.5">
          <TextRow
            label="Title"
            value={c.titleText}
            placeholder={home?.label ?? "Home"}
            onChange={(v) => set({ titleText: v })}
          />
          <TextRow
            label="Subtitle"
            value={c.subtitleText}
            placeholder={coordsPlaceholder}
            onChange={(v) => set({ subtitleText: v })}
          />
          <TextRow
            label="Footer"
            value={c.footerText}
            placeholder="PINPRINT"
            onChange={(v) => set({ footerText: v })}
          />
        </div>
      </DisclosureSection>

      {/* What to show */}
      <DisclosureSection title="What to show">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <Toggle
            label="Legend"
            checked={c.showLegend}
            onChange={(v) => set({ showLegend: v })}
          />
          <Toggle
            label="Distances"
            checked={c.showDistances}
            onChange={(v) => set({ showDistances: v })}
          />
          <Toggle
            label="North marker"
            checked={c.showNorth}
            onChange={(v) => set({ showNorth: v })}
          />
          <Toggle
            label="Footer"
            checked={c.showFooter}
            onChange={(v) => set({ showFooter: v })}
          />
        </div>
      </DisclosureSection>

      {/* Advanced */}
      <DisclosureSection title="Advanced">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <Heading>Place colours</Heading>
            <div className="flex flex-col gap-1.5">
              {AFFILIATION_ORDER.map((aff) => (
                <ColorRow
                  key={aff}
                  label={AFFILIATIONS[aff].label}
                  value={c.affiliationColors[aff] ?? null}
                  fallback={base.affiliationColors[aff]}
                  onChange={(v) => setAffiliationColor(aff, v)}
                />
              ))}
              <Toggle
                label="Colour-code arrows by place"
                checked={c.colorizeArrowsOverride ?? base.colorizeArrows}
                onChange={(v) => set({ colorizeArrowsOverride: v })}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Heading>Distance &amp; bearing</Heading>
            <div className="flex flex-wrap items-center gap-1.5">
              <PillButton
                size="sm"
                active={bearingMode === "great-circle"}
                onClick={() => setBearingMode("great-circle")}
                title="Great-circle: the true shortest-path bearing & distance"
              >
                Direct
              </PillButton>
              <PillButton
                size="sm"
                active={bearingMode === "rhumb"}
                onClick={() => setBearingMode("rhumb")}
                title="Rhumb line: constant-heading bearing and distance, matching a flat map"
              >
                Map
              </PillButton>
              <span className="mx-1 h-4 w-px bg-hairline" aria-hidden />
              {(["mi", "km"] as const).map((u) => (
                <PillButton
                  key={u}
                  size="sm"
                  active={units === u}
                  onClick={() => setUnits(u)}
                >
                  {u}
                </PillButton>
              ))}
            </div>
          </section>

          {templateId === "vintage-cartography" && (
            <section className="flex flex-col gap-2">
              <Heading>Heirloom variant</Heading>
              <div className="flex flex-wrap items-center gap-1.5">
                {VINTAGE_VARIANT_ORDER.map((v) => (
                  <PillButton
                    key={v}
                    size="sm"
                    active={v === vintageVariant}
                    onClick={() => setVintageVariant(v)}
                  >
                    {VINTAGE_VARIANT_LABELS[v]}
                  </PillButton>
                ))}
              </div>
            </section>
          )}
        </div>
      </DisclosureSection>

      <Button
        variant="outline"
        size="sm"
        onClick={resetCustomization}
        className="mt-5 self-start"
      >
        Reset to look defaults
      </Button>
    </div>
  );
}

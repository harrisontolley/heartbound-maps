"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { getActiveTemplate, TEMPLATES } from "@/lib/templates/registry";
import {
  VINTAGE_VARIANT_ORDER,
  VINTAGE_VARIANT_LABELS,
} from "@/lib/templates/vintageVariants";
import type { Customization } from "@/lib/templates/customize";
import type { TemplateId } from "@/lib/templates/types";
import { PillButton } from "@/components/ui/PillButton";
import { Button } from "@/components/ui/Button";

// Fine-grained controls, tucked behind the rail's collapsed "Advanced" section so
// the first glance stays calm. Everything the old all-in-one Customize panel
// exposed lives here, plus the globals relocated out of the header (bearing,
// units) and the two non-featured styles (art-deco, constellation).

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

/** The two styles not surfaced as featured looks. */
const MORE_STYLES: TemplateId[] = ["art-deco", "constellation"];

export function AdvancedPanel() {
  const templateId = usePosterStore((s) => s.templateId);
  const setTemplate = usePosterStore((s) => s.setTemplate);
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

  const coordsPlaceholder = home
    ? `${Math.abs(home.lat).toFixed(2)}°${home.lat >= 0 ? "N" : "S"} · ${Math.abs(home.lng).toFixed(2)}°${home.lng >= 0 ? "E" : "W"}`
    : "Latitude · Longitude";

  return (
    <div className="flex flex-col gap-5">
      {/* More styles */}
      <section className="flex flex-col gap-2">
        <Heading>More styles</Heading>
        <div className="flex flex-wrap gap-1.5">
          {MORE_STYLES.map((id) => (
            <PillButton
              key={id}
              size="sm"
              active={templateId === id}
              onClick={() => setTemplate(id)}
            >
              {TEMPLATES[id].name}
            </PillButton>
          ))}
        </div>
        {templateId === "vintage-cartography" && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] uppercase tracking-[0.09em] text-muted">
              Variant
            </span>
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
        )}
      </section>

      {/* Colors */}
      <section className="flex flex-col gap-2">
        <Heading>Colors</Heading>
        <ColorRow
          label="Paper"
          value={c.paperOverride}
          fallback={base.paper}
          onChange={(v) => set({ paperOverride: v })}
        />
        <ColorRow
          label="Ink"
          value={c.inkOverride}
          fallback={base.ink}
          onChange={(v) => set({ inkOverride: v })}
        />
        <ColorRow
          label="Accent"
          value={c.accentOverride}
          fallback={base.accent}
          onChange={(v) => set({ accentOverride: v })}
        />
      </section>

      {/* Text */}
      <section className="flex flex-col gap-2">
        <Heading>Text</Heading>
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
      </section>

      {/* Decoration */}
      <section className="flex flex-col gap-2">
        <Heading>Decoration</Heading>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <Toggle
            label="Compass rose"
            checked={c.roseOn ?? base.rose !== "none"}
            onChange={(v) => set({ roseOn: v })}
          />
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
      </section>

      {/* Show / hide elements */}
      <section className="flex flex-col gap-2">
        <Heading>Show</Heading>
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
      </section>

      {/* Geometry: bearing + units (relocated from the header) */}
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
            title="Rhumb line: constant-heading bearing & distance — matches a flat map"
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

      <Button
        variant="outline"
        size="sm"
        onClick={resetCustomization}
        className="self-start"
      >
        Reset to look defaults
      </Button>
    </div>
  );
}

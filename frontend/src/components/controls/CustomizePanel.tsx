"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { getActiveTemplate } from "@/lib/templates/registry";
import { POSTER_SIZES, POSTER_SIZE_ORDER } from "@/lib/templates/sizes";
import type { Customization } from "@/lib/templates/customize";
import { Button } from "@/components/ui/Button";
import { PillButton } from "@/components/ui/PillButton";

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
            className="text-[10px] text-muted transition-colors hover:text-ink"
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
    <label className="flex items-center gap-2 text-xs text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded-xs border-hairline-strong accent-ink"
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

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
      {children}
    </h3>
  );
}

export function CustomizePanel() {
  const templateId = usePosterStore((s) => s.templateId);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const home = usePosterStore((s) => s.home);
  const sizeId = usePosterStore((s) => s.sizeId);
  const setSize = usePosterStore((s) => s.setSize);
  const c = usePosterStore((s) => s.customization);
  const setC = usePosterStore((s) => s.setCustomization);
  const resetCustomization = usePosterStore((s) => s.resetCustomization);

  const base = getActiveTemplate(templateId, vintageVariant);
  const set = (patch: Partial<Customization>) => setC(patch);

  const coordsPlaceholder = home
    ? `${Math.abs(home.lat).toFixed(2)}°${home.lat >= 0 ? "N" : "S"} · ${Math.abs(home.lng).toFixed(2)}°${home.lng >= 0 ? "E" : "W"}`
    : "Latitude · Longitude";

  return (
    <details className="rounded-xl border border-hairline bg-surface-card" open>
      <summary className="cursor-pointer select-none px-4 py-2.5 text-base font-medium text-ink">
        Customize
      </summary>

      <div className="flex flex-col gap-4 border-t border-hairline-soft p-4">
        {/* Size & orientation */}
        <section className="flex flex-col gap-2">
          <Heading>Size</Heading>
          <div className="flex flex-wrap gap-1.5">
            {POSTER_SIZE_ORDER.map((id) => {
              const s = POSTER_SIZES[id];
              const active = id === sizeId;
              return (
                <PillButton
                  key={id}
                  active={active}
                  size="sm"
                  onClick={() => setSize(id)}
                  title={`${s.width}×${s.height}`}
                >
                  {s.label}{" "}
                  <span
                    className={active ? "text-on-primary/60" : "text-muted-soft"}
                  >
                    {s.ratio}
                  </span>
                </PillButton>
              );
            })}
          </div>
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

        <Button
          variant="outline"
          size="sm"
          onClick={resetCustomization}
          className="self-start"
        >
          Reset to template defaults
        </Button>
      </div>
    </details>
  );
}

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePosterStore } from "@/lib/store/posterStore";
import { DisclosureSection } from "@/components/ui/DisclosureSection";
import { PlaceSearch } from "@/components/controls/PlaceSearch";
import { PlaceList } from "@/components/controls/PlaceList";
import { LookGrid } from "./LookGrid";
import { SizePicker } from "./SizePicker";
import { AdvancedPanel } from "./AdvancedPanel";
import { activeLookId, LOOKS_BY_ID } from "@/lib/looks/looks";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";
import type { GeoResult } from "@/lib/types";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-strong" />,
});

/**
 * The left config rail: an editorial "spec-sheet" of collapsible sections.
 * Design + Places + Size open by default for an obvious first pass; the powerful
 * controls hide under a closed Advanced. No gradient orbs here — they bloom only
 * on the poster stage so nothing competes with the hero.
 */
export function ConfigRail({ className = "" }: { className?: string }) {
  const templateId = usePosterStore((s) => s.templateId);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const productId = usePosterStore((s) => s.productId);
  const addFromGeo = usePosterStore((s) => s.addFromGeo);

  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2600);
  }

  function handleSelect(r: GeoResult) {
    const result = addFromGeo(r);
    if (result === "duplicate") flash(`${r.label} is already on your map`);
    else if (result === "home") flash(`${r.label} set as home`);
  }

  const active = activeLookId(templateId, vintageVariant);
  const lookLabel = active ? LOOKS_BY_ID[active].label : "Custom";
  const product = PRODUCTS_BY_ID[productId];

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-hairline bg-canvas-soft lg:w-[380px] lg:border-r ${className}`}
    >
      <div className="flex flex-col px-4 pb-6">
        <DisclosureSection title="Design" accessory={lookLabel} defaultOpen>
          <LookGrid />
        </DisclosureSection>

        <DisclosureSection title="Places" defaultOpen>
          <div className="flex flex-col gap-4">
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
          </div>
        </DisclosureSection>

        <DisclosureSection title="Size" accessory={product.label} defaultOpen>
          <SizePicker />
        </DisclosureSection>

        <DisclosureSection title="Advanced">
          <AdvancedPanel />
        </DisclosureSection>
      </div>
    </aside>
  );
}

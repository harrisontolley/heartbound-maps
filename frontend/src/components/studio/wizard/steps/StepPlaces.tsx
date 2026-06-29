"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePosterStore } from "@/lib/store/posterStore";
import { PlaceSearch } from "@/components/controls/PlaceSearch";
import { PlaceList } from "@/components/controls/PlaceList";
import type { GeoResult } from "@/lib/types";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-strong" />,
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </p>
  );
}

/**
 * Step 2 — home + related places, in three clear bands: Search (sets home first,
 * then adds places), Your places (the list, home pinned on top), and Or drop a
 * pin (the map). The first place becomes home — the centre of the poster.
 */
export function StepPlaces() {
  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);
  const addFromGeo = usePosterStore((s) => s.addFromGeo);
  const [notice, setNotice] = useState<string | null>(null);

  const hasAny = !!home || places.length > 0;

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2600);
  }

  function handleSelect(r: GeoResult) {
    const result = addFromGeo(r);
    if (result === "duplicate") flash(`${r.label} is already on your map`);
    else if (result === "home") flash(`${r.label} set as home`);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <SectionLabel>Search</SectionLabel>
        <PlaceSearch onSelect={handleSelect} />
        {notice ? (
          <p className="text-xs text-muted">{notice}</p>
        ) : !home ? (
          <p className="text-xs text-muted">
            Start with your home town — it sits at the centre of your poster.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Add the places you have ties to — born, lived, visited, family.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        {hasAny && <SectionLabel>Your places</SectionLabel>}
        <PlaceList />
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Or drop a pin</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="h-60 w-full">
            <MapPicker />
          </div>
          <p className="bg-surface-strong px-2.5 py-1.5 text-[11px] text-muted">
            Click the map to drop a place · © OpenStreetMap · © CARTO
          </p>
        </div>
      </section>
    </div>
  );
}

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
 * Step 3 — the places you have ties to (home is already set on the previous
 * step). Search adds a place, the list shows them (home pinned on top), and the
 * map is a click-to-add alternative. The "Your places" band sits above the map in
 * stacking so the affiliation dropdown never hides behind it.
 */
export function StepPlaces() {
  const home = usePosterStore((s) => s.home);
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
    else flash(`Added ${r.label}`);
  }

  if (!home) {
    return (
      <div className="rounded-xl border border-hairline bg-surface-card p-4 text-sm text-muted">
        Set your home first: tap{" "}
        <span className="font-medium text-ink">Home</span> in the steps above.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <SectionLabel>Add a place</SectionLabel>
        <PlaceSearch onSelect={handleSelect} />
        <p className="text-xs text-muted">
          {notice ??
            "Add the places you have ties to: born, lived, visited, family."}
        </p>
      </section>

      <section className="relative z-10 flex flex-col gap-2">
        <SectionLabel>Your places</SectionLabel>
        <PlaceList />
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Or drop a pin</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="h-60 w-full">
            <MapPicker />
          </div>
          <p className="bg-surface-strong px-2.5 py-1.5 text-[11px] text-muted">
            Click the map to drop a place · © OpenStreetMap · © OpenFreeMap
          </p>
        </div>
      </section>
    </div>
  );
}

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

/**
 * Step 2 — home + related places. Lifted from the old ConfigRail "Places"
 * section: search (sets home, then adds places), the added-places list, and a
 * click-to-drop map. The first place becomes home (the poster's centre); a hint
 * shows while none is set.
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
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <PlaceSearch onSelect={handleSelect} />
        {notice && <p className="mt-2 text-xs text-muted">{notice}</p>}
      </div>

      {!home && (
        <p className="text-xs text-muted">
          Search a place or click the map to set your home — it sits at the centre
          of your poster.
        </p>
      )}

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
  );
}

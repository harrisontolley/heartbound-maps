"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { haversineKm, fmtDistance } from "@/lib/geo";
import type { Place } from "@/lib/types";
import { AffiliationPicker } from "./AffiliationPicker";
import { GradientOrbs } from "@/components/ui/GradientOrbs";

function HomeRow({ home }: { home: Place }) {
  const updatePlace = usePosterStore((s) => s.setHome);
  const resetAll = usePosterStore((s) => s.resetAll);
  return (
    <li className="rounded-lg border border-hairline bg-surface-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="rounded-pill bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-primary">
          Home
        </span>
        <input
          value={home.label}
          onChange={(e) => updatePlace({ ...home, label: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
          aria-label="Home label"
        />
        <button
          type="button"
          onClick={resetAll}
          title="Clear home"
          className="text-muted-soft transition-colors hover:text-error"
        >
          ✕
        </button>
      </div>
      <div className="truncate pl-0.5 text-xs text-muted">
        {home.fullName}
      </div>
    </li>
  );
}

function PlaceRow({ place, home }: { place: Place; home: Place | null }) {
  const units = usePosterStore((s) => s.units);
  const updatePlace = usePosterStore((s) => s.updatePlace);
  const removePlace = usePosterStore((s) => s.removePlace);
  const promoteToHome = usePosterStore((s) => s.promoteToHome);

  const distance = home ? fmtDistance(haversineKm(home, place), units) : null;

  return (
    <li className="rounded-lg border border-hairline bg-surface-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <AffiliationPicker
          value={place.affiliation}
          onChange={(a) => updatePlace(place.id, { affiliation: a })}
        />
        <input
          value={place.label}
          onChange={(e) => updatePlace(place.id, { label: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
          aria-label={`${place.label} label`}
        />
        <button
          type="button"
          onClick={() => promoteToHome(place.id)}
          title="Set as home"
          className="text-muted-soft transition-colors hover:text-ink"
        >
          ⌂
        </button>
        <button
          type="button"
          onClick={() => removePlace(place.id)}
          title="Remove"
          className="text-muted-soft transition-colors hover:text-error"
        >
          ✕
        </button>
      </div>
      <div className="flex justify-between pl-0.5 text-xs text-muted">
        <span className="truncate">{place.fullName}</span>
        {distance && <span className="ml-2 shrink-0 tabular-nums">{distance}</span>}
      </div>
    </li>
  );
}

export function PlaceList() {
  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);

  if (!home && places.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xxl bg-canvas-soft px-5 py-9 text-center">
        <GradientOrbs preset="card" />
        <div className="relative z-10">
          <p className="font-display text-xl text-ink">
            The places that matter
          </p>
          <p className="mx-auto mt-2 max-w-[28ch] text-sm text-muted">
            Search a place to set your home, then add the places you have ties
            to.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {home && <HomeRow home={home} />}
      {places.map((p) => (
        <PlaceRow key={p.id} place={p} home={home} />
      ))}
    </ul>
  );
}

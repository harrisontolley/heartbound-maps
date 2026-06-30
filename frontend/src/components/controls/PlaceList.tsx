"use client";

import { useRef } from "react";
import { usePosterStore } from "@/lib/store/posterStore";
import { haversineKm, fmtDistance } from "@/lib/geo";
import type { Place } from "@/lib/types";
import { AffiliationPicker } from "./AffiliationPicker";
import { GradientOrbs } from "@/components/ui/GradientOrbs";

function HomeGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 7.5L8 3l5.5 4.5M4 6.5V13h8V6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted-soft transition-colors group-hover:text-ink group-focus-within:text-ink"
    >
      <path
        d="M10.5 2.5l3 3M2.5 13.5l.6-2.6 7.4-7.4 2 2-7.4 7.4-2.6.6z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * An obviously-editable name field: the text doubles as an input, with a pencil
 * cue and a hover/focus background so it's clear you can click to rename.
 */
export function NameField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span
      onClick={() => ref.current?.focus()}
      className="group flex min-w-0 flex-1 cursor-text items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:bg-surface-strong focus-within:bg-surface-card focus-within:ring-1 focus-within:ring-hairline-strong"
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
      />
      <PencilGlyph />
    </span>
  );
}

function IconButton({
  title,
  onClick,
  danger = false,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-soft transition-colors hover:bg-surface-strong ${
        danger ? "hover:text-error" : "hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function HomeRow({ home }: { home: Place }) {
  const setHome = usePosterStore((s) => s.setHome);
  return (
    <li className="rounded-lg border border-hairline-strong bg-surface-strong/50 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="flex shrink-0 items-center gap-1 rounded-pill bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-primary">
          <HomeGlyph />
          Home
        </span>
        <NameField
          value={home.label}
          onChange={(v) => setHome({ ...home, label: v })}
          ariaLabel="Home label"
        />
      </div>
      <div className="mt-1 truncate pl-1 text-xs text-muted">
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
    <li className="rounded-lg border border-hairline bg-surface-card p-2.5">
      <div className="flex items-center gap-1.5">
        <NameField
          value={place.label}
          onChange={(v) => updatePlace(place.id, { label: v })}
          ariaLabel={`${place.label} label`}
        />
        {distance && (
          <span className="shrink-0 rounded-pill bg-surface-strong px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted">
            {distance}
          </span>
        )}
        <IconButton title="Set as home" onClick={() => promoteToHome(place.id)}>
          <HomeGlyph />
        </IconButton>
        <IconButton title="Remove" danger onClick={() => removePlace(place.id)}>
          <CloseGlyph />
        </IconButton>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <AffiliationPicker
          value={place.affiliation}
          onChange={(a) => updatePlace(place.id, { affiliation: a })}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-muted">
          {place.fullName}
        </span>
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
          <p className="font-display text-xl text-ink">The places that matter</p>
          <p className="mx-auto mt-2 max-w-[28ch] text-sm text-muted">
            Search a place to set your home, then add the places you have ties to.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-soft">Tap a name to rename it.</p>
      <ul className="flex flex-col gap-1.5">
        {home && <HomeRow home={home} />}
        {places.map((p) => (
          <PlaceRow key={p.id} place={p} home={home} />
        ))}
      </ul>
    </div>
  );
}

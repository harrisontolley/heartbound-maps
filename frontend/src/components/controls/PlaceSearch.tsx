"use client";

import { useState } from "react";
import { useGeocodeSearch } from "@/hooks/useGeocodeSearch";
import type { GeoResult } from "@/lib/types";

/** Debounced autocomplete. Calls onSelect with the chosen geocoder result. */
export function PlaceSearch({
  onSelect,
  placeholder = "Search a city, town, or village…",
}: {
  onSelect: (r: GeoResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, status } = useGeocodeSearch(query);
  const show = open && query.trim().length >= 3;

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-hairline-strong bg-surface-card px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-ink focus:ring-1 focus:ring-ink"
      />
      {show && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-hairline bg-surface-card shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          {status === "loading" && (
            <div className="px-3.5 py-2.5 text-sm text-muted">Searching…</div>
          )}
          {status === "empty" && (
            <div className="px-3.5 py-2.5 text-sm text-muted">No matches</div>
          )}
          {status === "error" && (
            <div className="px-3.5 py-2.5 text-sm text-error">
              Search failed — try again
            </div>
          )}
          {status === "success" &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(r);
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full border-b border-hairline-soft px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-strong"
              >
                <div className="text-sm font-medium text-ink">
                  {r.label}
                  {r.kind && (
                    <span className="ml-2 rounded-pill bg-surface-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {r.kind}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted">
                  {r.fullName}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useGeocodeSearch } from "@/hooks/useGeocodeSearch";
import type { GeoResult } from "@/lib/types";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 14.5s5-4.2 5-8a5 5 0 10-10 0c0 3.8 5 8 5 8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * Debounced autocomplete with full keyboard support (↓/↑ to move, Enter to add,
 * Esc to close). A leading search icon, highlighted active row, and a per-result
 * pin icon + kind chip make results easy to scan. Calls onSelect with the chosen
 * geocoder result.
 */
export function PlaceSearch({
  onSelect,
  placeholder = "Search a city, town, or village…",
}: {
  onSelect: (r: GeoResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { results, status } = useGeocodeSearch(query);
  const listRef = useRef<HTMLDivElement>(null);
  const show = open && query.trim().length >= 3;
  const listId = "place-search-list";

  // Keep the keyboard-active row scrolled into view.
  useEffect(() => {
    if (!show) return;
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [active, show]);

  function choose(r: GeoResult) {
    onSelect(r);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!show || status !== "success" || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) choose(r);
    }
  }

  const activeId =
    show && status === "success" && results[active]
      ? `ps-opt-${results[active].id}`
      : undefined;

  return (
    <div className="relative">
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft"
          aria-hidden
        >
          <SearchIcon />
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-activedescendant={activeId}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0); // each keystroke triggers a fresh search; reset highlight
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-hairline-strong bg-surface-card pl-9 pr-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-ink focus:ring-1 focus:ring-ink"
        />
      </div>
      {show && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-hairline bg-surface-card shadow-card"
        >
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
            results.map((r, i) => (
              <button
                key={r.id}
                id={`ps-opt-${r.id}`}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={`flex w-full items-start gap-2.5 border-b border-hairline-soft px-3 py-2.5 text-left transition-colors last:border-0 ${
                  i === active ? "bg-surface-strong" : "hover:bg-surface-strong"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-muted-soft">
                  <PinIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {r.label}
                    {r.kind && (
                      <span className="ml-2 rounded-pill bg-surface-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {r.kind}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {r.fullName}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

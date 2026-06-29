"use client";

import { useEffect, useRef, useState } from "react";
import type { Affiliation } from "@/lib/types";
import {
  AFFILIATIONS,
  AFFILIATION_ORDER,
  AffiliationIcon,
} from "@/lib/affiliations";

/**
 * Tie-type selector. A compact trigger shows the current affiliation (colored
 * icon + label + chevron); clicking opens a small popover listing the four
 * options. Replaces the old four tiny low-opacity icon buttons — clearer to
 * read, easier to hit, and self-labelling.
 */
export function AffiliationPicker({
  value,
  onChange,
}: {
  value: Affiliation;
  onChange: (a: Affiliation) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // When the menu is near the bottom of the scrolling step panel, nudge it fully
  // into view so it never opens hidden behind the fold / sticky nav.
  useEffect(() => {
    if (open) menuRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = AFFILIATIONS[value];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change tie"
        className="flex items-center gap-1.5 rounded-pill border border-hairline-strong bg-surface-card py-1 pl-2 pr-1.5 text-xs font-medium text-body transition-colors hover:bg-surface-strong"
      >
        <span className="flex" style={{ color: current.color }}>
          <AffiliationIcon type={value} size={14} />
        </span>
        <span>{current.label}</span>
        <svg
          className={`h-3 w-3 text-muted-soft transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          ref={menuRef}
          role="listbox"
          className="absolute left-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-lg border border-hairline bg-surface-card py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          {AFFILIATION_ORDER.map((a) => {
            const aff = AFFILIATIONS[a];
            const isActive = a === value;
            return (
              <li key={a}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(a);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-strong ${
                    isActive ? "text-ink" : "text-body"
                  }`}
                >
                  <span className="flex" style={{ color: aff.color }}>
                    <AffiliationIcon type={a} size={15} />
                  </span>
                  <span className="flex-1">{aff.label}</span>
                  {isActive && (
                    <svg
                      className="h-3.5 w-3.5 text-ink"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M3.5 8.5l3 3 6-6.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

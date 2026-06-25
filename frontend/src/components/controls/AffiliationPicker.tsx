"use client";

import type { Affiliation } from "@/lib/types";
import {
  AFFILIATIONS,
  AFFILIATION_ORDER,
  AffiliationIcon,
} from "@/lib/affiliations";

/** Compact row of four tie-type buttons; the active one is highlighted. */
export function AffiliationPicker({
  value,
  onChange,
}: {
  value: Affiliation;
  onChange: (a: Affiliation) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {AFFILIATION_ORDER.map((a) => {
        const active = a === value;
        return (
          <button
            key={a}
            type="button"
            title={AFFILIATIONS[a].label}
            aria-label={AFFILIATIONS[a].label}
            aria-pressed={active}
            onClick={() => onChange(a)}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
              active
                ? "bg-surface-strong ring-1 ring-hairline-strong"
                : "opacity-35 hover:opacity-90"
            }`}
            style={{ color: AFFILIATIONS[a].color }}
          >
            <AffiliationIcon type={a} size={15} />
          </button>
        );
      })}
    </div>
  );
}

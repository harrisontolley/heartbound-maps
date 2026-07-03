import type { ReactNode } from "react";

/**
 * A collapsible config section in the studio rail (DESIGN.md "atlas spec-sheet").
 * Native <details>/<summary> so it works without JS and is keyboard-accessible.
 * The summary is an uppercase tracked label with an optional muted accessory
 * (e.g. the active look or size) and a chevron that rotates when open.
 */
export function DisclosureSection({
  title,
  accessory,
  defaultOpen = false,
  className = "",
  children,
}: {
  title: string;
  /** Small muted status shown at the right of the summary (e.g. "Advanced"). */
  accessory?: ReactNode;
  defaultOpen?: boolean;
  /** Extra classes on the root <details> (e.g. flex order for mobile). */
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      className={`group border-b border-hairline ${className}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {accessory != null && (
            <span className="text-xs text-body-strong">{accessory}</span>
          )}
          <svg
            className="h-4 w-4 text-muted-soft transition-transform duration-200 group-open:rotate-180"
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
        </span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

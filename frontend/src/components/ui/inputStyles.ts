/**
 * Shared text-input styling. The 16px font size is load-bearing: iOS Safari
 * auto-zooms on focus for any input below 16px, so inputs must never drop back
 * to text-sm — not even behind a viewport breakpoint (iPads are md+ and still
 * zoom). Callsites add their own height (h-11 standard) and padding overrides.
 */
export const INPUT_CLASS =
  "w-full rounded-md border border-hairline-strong bg-surface-card px-3 text-[16px] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-ink focus:ring-1 focus:ring-ink";

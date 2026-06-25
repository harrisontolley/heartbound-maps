/**
 * Labeled placeholder for an image or video that hasn't been produced yet.
 *
 * Renders a dashed frame at a given aspect ratio with a badge, a description of
 * what asset belongs here, and the aspect. Nothing is fetched. When a real asset
 * arrives, swap this for `next/image` (or a <video>) at the same aspect.
 */

type Props = {
  /** What the final asset should show. */
  label: string;
  /** CSS aspect-ratio value, e.g. "4 / 5", "16 / 10", "1 / 1". Defaults to 16/9. */
  aspect?: string;
  kind?: "image" | "video";
  /** Optional extra note shown under the label. */
  caption?: string;
  className?: string;
};

export function MediaPlaceholder({
  label,
  aspect = "16 / 9",
  kind = "image",
  caption,
  className = "",
}: Props) {
  return (
    <div
      role="img"
      aria-label={`Placeholder: ${label}`}
      style={{ aspectRatio: aspect }}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong bg-canvas-soft p-6 text-center ${className}`}
    >
      {kind === "video" && (
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline-strong text-ink"
        >
          ▶
        </span>
      )}
      <span className="text-[11px] font-semibold uppercase tracking-[0.96px] text-muted-soft">
        {kind === "video" ? "Video placeholder" : "Placeholder"}
      </span>
      <span className="max-w-[34ch] text-sm leading-snug text-muted">
        {label}
      </span>
      {caption && (
        <span className="max-w-[34ch] text-xs leading-snug text-muted-soft">
          {caption}
        </span>
      )}
      <span className="text-[11px] tabular-nums text-muted-soft">
        aspect {aspect.replace(/\s/g, "")}
      </span>
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Shared visual language for every line-art icon in the app: thin hairline
 * strokes, no fill, 24×24 viewBox — the same treatment `affiliations/icons.tsx`
 * established for poster glyphs, extracted here so generic marketing/UI icons
 * (shipping, paper, menu, ...) match it exactly instead of drifting.
 */
export const LINE_ICON_STROKE_WIDTH = 1.75;

/** The `<svg>` wrapper every icon renders its stroke paths into. */
export function LineIconFrame({
  size = 16,
  color = "currentColor",
  strokeWidth = LINE_ICON_STROKE_WIDTH,
  className,
  children,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export type LineIconProps = {
  size?: number;
  color?: string;
  className?: string;
};

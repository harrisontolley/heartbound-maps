import type { ButtonHTMLAttributes } from "react";

/**
 * Selectable / segmented pill (DESIGN.md). Active = ink fill; inactive = transparent
 * with a hairline outline. Used for toggles (bearing, units) and option groups
 * (templates, vintage variants, sizes). Forwards native button props and sets
 * aria-pressed from `active`.
 */

type Size = "sm" | "md";

const BASE =
  "inline-flex shrink-0 items-center justify-center rounded-pill border font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

// Compact on desktop; grows to a comfortable touch size on coarse-pointer
// devices only, so dense studio panels keep their desktop density.
const SIZES: Record<Size, string> = {
  sm: "h-7 px-3 text-xs pointer-coarse:h-10 pointer-coarse:px-3.5 pointer-coarse:text-sm",
  md: "h-9 px-4 text-sm pointer-coarse:h-11",
};

export function PillButton({
  active,
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  size?: Size;
}) {
  const tone = active
    ? "border-primary bg-primary text-on-primary"
    : "border-hairline-strong text-body hover:bg-surface-strong";
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`${BASE} ${SIZES[size]} ${tone} ${className}`}
      {...props}
    />
  );
}

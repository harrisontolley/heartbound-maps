import type { ButtonHTMLAttributes } from "react";

/**
 * Editorial CTA button (DESIGN.md). Pill geometry; ink fill is the only primary
 * action color. `primary` = near-black ink pill, `outline` = transparent + hairline,
 * `tertiary` = bare ink text link. Forwards all native button props (onClick,
 * disabled, title, type, …).
 */

type Variant = "primary" | "outline" | "tertiary";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

const SIZES: Record<Size, string> = {
  sm: "h-9 rounded-pill px-4 text-sm",
  md: "h-10 rounded-pill px-5 text-[15px]",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-active",
  outline:
    "border border-hairline-strong text-ink hover:bg-surface-strong",
  tertiary: "px-0 text-ink hover:text-muted",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

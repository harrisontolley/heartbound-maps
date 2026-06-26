import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Editorial CTA rendered as a real anchor (Next.js Link) so it navigates and
 * prefetches. Mirrors the visual variants of `ui/Button.tsx` exactly — that
 * component is a native <button> and can't be an anchor, so CTAs use this
 * instead of nesting <Link><Button>.
 */

type Variant = "primary" | "outline" | "tertiary";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

const SIZES: Record<Size, string> = {
  sm: "h-9 rounded-pill px-4 text-sm",
  md: "h-10 rounded-pill px-5 text-[15px]",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-active",
  outline: "border border-hairline-strong text-ink hover:bg-surface-strong",
  tertiary: "px-0 text-ink hover:text-muted",
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <Link
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

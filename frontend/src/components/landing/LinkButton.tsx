import Link from "next/link";
import type { ComponentProps } from "react";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "../ui/buttonStyles";

/**
 * Editorial CTA rendered as a real anchor (Next.js Link) so it navigates and
 * prefetches. Visuals come from `ui/buttonStyles.ts`, shared with `ui/Button.tsx` —
 * that component is a native <button> and can't be an anchor, so CTAs use this
 * instead of nesting <Link><Button>.
 */

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      className={`${buttonClasses(variant, size)} ${className}`}
      {...props}
    />
  );
}

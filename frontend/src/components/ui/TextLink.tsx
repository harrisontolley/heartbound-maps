import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Inline text link with a consistent editorial treatment — replaces the ad-hoc
 * underline/hover styles previously scattered across hero, section arrows, nav
 * and footer. `ink` = standalone CTA link (underlines on hover); `body` = quiet
 * nav/footer link (darkens on hover).
 *
 * On coarse-pointer devices the vertical padding + negative margin expand the
 * hit area toward 44px without shifting the surrounding layout.
 */

type Tone = "ink" | "body";
type Size = "sm" | "md";

const BASE =
  "relative inline-flex items-center gap-1 transition-colors underline-offset-4 pointer-coarse:py-2.5 pointer-coarse:-my-2.5";

const SIZES: Record<Size, string> = {
  sm: "text-[14px]",
  md: "text-[15px]",
};

// `ink` carries medium weight; `body` stays weight-neutral so quiet contexts
// (footer columns) keep regular weight and nav can add font-medium itself.
const TONES: Record<Tone, string> = {
  ink: "font-medium text-ink hover:underline",
  body: "text-body hover:text-ink",
};

export function TextLink({
  tone = "ink",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  tone?: Tone;
  size?: Size;
}) {
  return (
    <Link
      className={`${BASE} ${SIZES[size]} ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}

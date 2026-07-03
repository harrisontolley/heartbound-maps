"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "../ui/buttonStyles";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";

/**
 * Editorial CTA rendered as a real anchor (Next.js Link) so it navigates and
 * prefetches. Visuals come from `ui/buttonStyles.ts`, shared with `ui/Button.tsx` —
 * that component is a native <button> and can't be an anchor, so CTAs use this
 * instead of nesting <Link><Button>. Client component so it can fire
 * landing_cta_click on click — pass `trackId` + `trackLocation` to opt a given
 * CTA into that event (omit either to skip tracking, e.g. account-nav links).
 */

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  trackId,
  trackLocation,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  trackId?: string;
  trackLocation?: string;
}) {
  const track = useTrackEvent();
  return (
    <Link
      className={`${buttonClasses(variant, size)} ${className}`}
      onClick={(e) => {
        if (trackId && trackLocation) {
          track(ANALYTICS_EVENTS.landingCtaClick, {
            cta_id: trackId,
            location: trackLocation,
            href: typeof props.href === "string" ? props.href : String(props.href),
          });
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}

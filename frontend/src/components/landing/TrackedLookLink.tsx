"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";

/**
 * A next/link that fires look_selected before navigating into the studio deep
 * link — StyleGallery's cards are plain marketing links today, but the click
 * is exactly the same signal as picking a look inside the studio (LookGrid).
 */
export function TrackedLookLink({
  lookId,
  templateId,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { lookId: string; templateId: string }) {
  const track = useTrackEvent();
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(ANALYTICS_EVENTS.lookSelected, {
          look_id: lookId,
          template_id: templateId,
          source: "landing_gallery",
        });
        onClick?.(e);
      }}
    />
  );
}

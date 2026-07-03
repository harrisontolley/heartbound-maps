"use client";

import { usePostHog } from "posthog-js/react";
import type { AnalyticsEventProps } from "./events";

/**
 * Typed wrapper around posthog.capture — callers get autocomplete + a
 * compile-time check that they passed the right properties for the event
 * name, instead of freehand strings drifting from docs/integrations/posthog.md.
 * No-ops safely when PostHog isn't configured (usePostHog returns a client
 * whose capture() is already a no-op in that case).
 */
export function useTrackEvent() {
  const posthog = usePostHog();
  return function track<E extends keyof AnalyticsEventProps>(
    event: E,
    properties: AnalyticsEventProps[E],
  ) {
    posthog.capture(event, properties);
  };
}

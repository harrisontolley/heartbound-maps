"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { authClient } from "@/lib/auth/client";
import { ANALYTICS_EVENTS } from "./events";
import { useTrackEvent } from "./useTrackEvent";

/**
 * Ties the PostHog person to the Neon Auth account: identify(id, email/name)
 * when a session appears, reset() when it goes away, so events and replays
 * line up with real customers instead of anonymous ids. Renders nothing.
 * Mounted only inside the PHProvider branch of Providers, so it never runs
 * without a PostHog key.
 */
export function PostHogIdentify() {
  const posthog = usePostHog();
  const track = useTrackEvent();
  const session = authClient.useSession();
  const user = session.data?.user as
    | { id?: string; email?: string; name?: string }
    | undefined;
  const userId = user?.id;
  // Tracks who we last identified, so a re-render can't re-fire identify and a
  // fresh anonymous visitor (never identified) can't trigger a spurious reset.
  const identifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (userId) {
      if (identifiedId.current === userId) return;
      identifiedId.current = userId;
      posthog.identify(userId, { email: user?.email, name: user?.name });
      track(ANALYTICS_EVENTS.signedIn, {});
    } else if (identifiedId.current) {
      identifiedId.current = null;
      posthog.reset();
    }
  }, [posthog, track, userId, user?.email, user?.name]);

  return null;
}

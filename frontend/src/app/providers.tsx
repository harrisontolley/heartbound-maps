"use client";

import { type ReactNode, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { AuthProvider } from "./auth-provider";
import { CartHydrator } from "@/components/cart/CartHydrator";

// Client-side PostHog: product analytics + session replay + exception capture.
// Env-guarded — with no NEXT_PUBLIC_POSTHOG_KEY this is a no-op passthrough, so the
// app builds and runs without PostHog (and tests/CI stay clean). Events go to
// /ingest, which next.config.ts reverse-proxies to PostHog to dodge ad blockers.
// See docs/integrations/posthog.md.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest";

let started = false;

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!KEY || started) return;
    started = true;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      capture_exceptions: true, // error tracking (replaces Sentry here)
      disable_session_recording: false, // session replay
      session_recording: { maskAllInputs: true }, // privacy: never record raw inputs
    });
  }, []);

  // AuthProvider always wraps the tree so Neon Auth context (UserButton, useSession,
  // AuthView) is available everywhere; PostHog stays env-guarded inside it.
  return (
    <AuthProvider>
      <CartHydrator />
      {KEY ? <PHProvider client={posthog}>{children}</PHProvider> : children}
    </AuthProvider>
  );
}

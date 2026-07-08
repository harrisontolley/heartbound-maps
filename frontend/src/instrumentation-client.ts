// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Env-guarded like our other integrations (db.ts / PostHog): with no
// NEXT_PUBLIC_SENTRY_DSN the SDK starts disabled and sends nothing, so the app
// builds and tests stay hermetic without a key. Errors-only — no tracing,
// replay, or logs configured. See docs/integrations/sentry.md.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Don't send PII (IP, request headers, user data). Heartbound Maps handles shipping
  // addresses + accounts, so error payloads stay free of personal data. Sentry's
  // default is false; set true only if you deliberately want user/IP context.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

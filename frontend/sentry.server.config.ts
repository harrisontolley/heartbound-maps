// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Env-guarded (see db.ts / PostHog): with no NEXT_PUBLIC_SENTRY_DSN the SDK
// starts disabled and sends nothing, so builds/tests stay hermetic without a
// key. Errors-only. See docs/integrations/sentry.md.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Don't send PII (IP, headers, user data) — Heartbound Maps handles addresses +
  // accounts. Default is false; set true only to deliberately capture context.
  sendDefaultPii: false,
});

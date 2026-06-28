import * as Sentry from "@sentry/node";

// Error tracking for the API. Env-guarded like db.ts (getSql): with no SENTRY_DSN
// nothing is initialized and nothing is sent, so the app builds and the tests stay
// hermetic without a key. Errors-only — tracing is off. This is a separate Sentry
// project from the frontend's NEXT_PUBLIC_SENTRY_DSN. The DSN is server-side only
// (NOT NEXT_PUBLIC) so it is never bundled to the browser.

let started = false;

/** Initialize Sentry once, only when SENTRY_DSN is set. Safe to call repeatedly. */
export function initSentry(): void {
  if (started) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0, // errors-only: no performance tracing
    sendDefaultPii: false, // never ship IPs/headers/user data (we handle addresses + accounts)
  });
  started = true;
}

/** True when SENTRY_DSN is configured — surfaced by GET /health/integrations. */
export function isSentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

/** Report an exception when Sentry is initialized; a no-op otherwise. */
export function captureError(err: unknown): void {
  if (!started) return;
  Sentry.captureException(err);
}

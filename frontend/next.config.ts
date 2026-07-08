import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Geocoding lives in the backend service. The client calls it directly via
// NEXT_PUBLIC_BACKEND_URL (see src/lib/api.ts): in production Vercel injects the
// relative route prefix "/_/backend" (same origin, no CORS); in local dev it's
// the backend dev server.
//
// PostHog reverse proxy: analytics is sent to /ingest (same origin) so ad blockers
// don't drop it, then rewritten to PostHog. See docs/integrations/posthog.md.
const POSTHOG_UPSTREAM =
  process.env.NEXT_PUBLIC_POSTHOG_UPSTREAM ?? "https://us.i.posthog.com";
const POSTHOG_ASSETS = POSTHOG_UPSTREAM.replace(".i.posthog.com", "-assets.i.posthog.com");

// Defense-in-depth response headers. The CSP is intentionally Report-Only for
// now: enforcing it needs a pass against Next's inline bootstrap scripts, the
// PostHog SDK, the Stripe hosted-checkout redirect, and the Sentry tunnel — turn
// it into `Content-Security-Policy` only after verifying nothing is blocked.
const cspReportOnly = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' cover Next's inline hydration bootstrap; tighten with nonces later.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Same-origin backend + PostHog/Sentry (proxied same-origin) + Stripe.
  "connect-src 'self' https://*.posthog.com https://*.sentry.io https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@pinprint/shared"],
  // PostHog sends a trailing-slash-sensitive request to /ingest/decide.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_UPSTREAM}/:path*` },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "pinprint",

  project: "pinprint-frontend",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

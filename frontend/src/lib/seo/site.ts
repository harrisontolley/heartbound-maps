// Canonical site origin + URL helpers for SEO metadata (canonical links, OG/Twitter
// images, sitemap, robots). Centralized here so every absolute URL is built one way.
//
// The origin comes from NEXT_PUBLIC_SITE_URL (set per environment in Vercel),
// falling back to the production domain for local/preview builds — matching the
// repo's `process.env.NEXT_PUBLIC_X ?? "fallback"` convention. NOTE: confirm the
// real production domain and set NEXT_PUBLIC_SITE_URL before launch, or canonical
// and sitemap URLs will point at this fallback.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinprint.com";

/** Absolute site origin, no trailing slash (e.g. "https://pinprint.com"). */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

/** Resolve a root-relative path to an absolute URL, e.g. "/compare" → "https://…/compare". */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Default Open Graph / Twitter share image. Reuses the existing hero asset so the
 * card never 404s; swap for a purpose-built 1200×630 image when one exists.
 */
export const OG_IMAGE = "/showcase/poster_on_wall.png";

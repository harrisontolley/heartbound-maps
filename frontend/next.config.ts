import type { NextConfig } from "next";

// Geocoding lives in the backend service. The client calls it directly via
// NEXT_PUBLIC_BACKEND_URL (see src/lib/api.ts): in production Vercel injects the
// relative route prefix "/_/backend" (same origin, no CORS); in local dev it's
// the backend dev server. No rewrite needed.
const nextConfig: NextConfig = {
  transpilePackages: ["@pinprint/shared"],
};

export default nextConfig;

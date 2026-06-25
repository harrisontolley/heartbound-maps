import type { NextConfig } from "next";

// The backend (Hono) owns geocoding. The client still calls same-origin
// /api/geocode/*; these rewrites proxy those to the backend, so there is no CORS
// and the client hooks are unchanged. BACKEND_URL points at the local dev server
// (http://localhost:8787) or the deployed API in production.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  transpilePackages: ["@pinprint/shared"],
  async rewrites() {
    return [
      {
        source: "/api/geocode/:path*",
        destination: `${BACKEND_URL}/geocode/:path*`,
      },
    ];
  },
};

export default nextConfig;

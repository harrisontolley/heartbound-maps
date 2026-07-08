// Base URL for the Heartbound Maps backend service.
//
// - Production (Vercel "Services"): Vercel auto-injects NEXT_PUBLIC_BACKEND_URL
//   as the relative route prefix "/_/backend" — same origin, so no CORS and it
//   works across preview deployments and custom domains.
// - Local dev: set NEXT_PUBLIC_BACKEND_URL to the backend dev server
//   (http://localhost:8787) in frontend/.env.
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "/_/backend";

/** Build a backend URL for a path such as "/geocode/search". */
export const apiUrl = (path: string): string => `${BACKEND_URL}${path}`;

import { Redis } from "@upstash/redis";

// Server-only Upstash Redis for the Next.js side. The single consumer today is the
// auth-proxy route handler (brute-force protection on sign-in/sign-up). Lazy +
// env-guarded exactly like the backend's redis.ts: null when UPSTASH_REDIS_REST_*
// is unset, so the limiter falls open and builds/tests stay green without keys.
//
// SECURITY: the token must NEVER reach the browser — these are not NEXT_PUBLIC_
// vars, and this module must only ever be imported from server code (route
// handlers / server components), never a "use client" file.

let client: Redis | null = null;

/** Returns an Upstash Redis client, or null when UPSTASH_REDIS_REST_* is unset. */
export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token, retry: { retries: 1 } });
  return client;
}

/** True when both Upstash env vars are present. No network call. */
export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

// Namespace every key by deployment env (one Upstash DB is shared by dev/preview/
// prod) and keep it identical to the backend's scheme so both sides agree.
function envSlug(): string {
  switch (process.env.VERCEL_ENV) {
    case "production":
      return "prod";
    case "preview":
      return "preview";
    default:
      return "dev";
  }
}

/** Build an env-namespaced, colon-separated key, e.g. rk("rl","auth",ip). */
export function rk(...parts: string[]): string {
  return `pinprint:${envSlug()}:${parts.join(":")}`;
}

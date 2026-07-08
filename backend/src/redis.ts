import { Redis } from "@upstash/redis";

// Upstash Redis (REST) — distributed state that must survive the serverless,
// multi-instance world: rate-limit counters, the geocode cache, the Nominatim
// upstream gate, and checkout idempotency. Lazy + env-guarded exactly like
// db.ts/stripe.ts: getRedis() returns null when UPSTASH_REDIS_REST_* is unset,
// so every caller falls back to in-memory behaviour and the app/tests stay
// hermetic without keys. Redis is never on a critical path that 500s — callers
// fail open (see rateLimit.ts / nominatim.ts).

let client: Redis | null = null;

/** Returns an Upstash Redis client, or null when UPSTASH_REDIS_REST_* is unset. */
export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  // Explicit constructor (not Redis.fromEnv(), which throws when unset and would
  // break the null-guard convention). One retry bounds worst-case latency.
  client = new Redis({ url, token, retry: { retries: 1 } });
  return client;
}

/** True when both Upstash env vars are present. No network call (for /health). */
export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * The deployment env, used to namespace every Redis key. One Upstash DB is shared
 * by dev/preview/prod today, so without this dev traffic would corrupt prod
 * counters/caches. Derived from VERCEL_ENV; anything non-Vercel is "dev".
 */
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

/** `heartbound:{env}` — the prefix every key (and every Ratelimit) lives under. */
export function keyPrefix(): string {
  return `heartbound:${envSlug()}`;
}

/** Build an env-namespaced, colon-separated key, e.g. rk("geo","s",q). */
export function rk(...parts: string[]): string {
  return `${keyPrefix()}:${parts.join(":")}`;
}

/** Liveness check against Redis. Returns false if unconfigured or unreachable. */
export async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

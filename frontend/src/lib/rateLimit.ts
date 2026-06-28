import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, rk } from "./redis";

// Distributed rate limiting for the Next.js server side (the auth proxy). Mirrors
// the backend's enforce(): Upstash sliding window with an ephemeralCache + timeout,
// and fail-open — when Redis is unset or errors, enforceLimit returns false
// (allowed) so the app never blocks legitimate traffic on a Redis hiccup.

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, opts: { max: number; windowMs: number }): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${name}:${opts.max}:${opts.windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowMs} ms`),
      prefix: rk("rl", name),
      ephemeralCache: new Map<string, number>(),
      analytics: false,
      timeout: 1000,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Returns true when `identifier` is rate-limited for `name`. Allows (false) when
 * Redis is unconfigured or the call errors — fail-open.
 */
export async function enforceLimit(
  identifier: string,
  name: string,
  opts: { max: number; windowMs: number },
): Promise<boolean> {
  const limiter = getLimiter(name, opts);
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit(identifier);
    return !success;
  } catch {
    return false;
  }
}

/** Best-effort client IP from proxy headers — prefer the non-spoofable x-real-ip. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

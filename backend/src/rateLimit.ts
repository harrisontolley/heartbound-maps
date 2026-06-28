import type { Context } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, rk } from "./redis.js";

// Rate limiting in two layers. The primary path is Upstash Redis (distributed, so
// the limit holds across every serverless instance — see enforce() below). When
// Redis is unconfigured OR errors, we fall back to this in-memory limiter: a
// per-instance speed bump, not a hard quota. The fallback is also what keeps the
// Vitest suites hermetic (no keys → no network).

type Bucket = { count: number; resetAt: number };
const namespaces = new Map<string, Map<string, Bucket>>();

/** Test seam: clear all limiter state. */
export function __resetRateLimits(): void {
  namespaces.clear();
}

/**
 * Returns true when `key` has exceeded `max` hits within `windowMs` for the given
 * `name` bucket. Separate namespaces so endpoints don't share a budget.
 */
export function rateLimit(
  name: string,
  key: string,
  opts: { max: number; windowMs: number },
  now: number = Date.now(),
): boolean {
  let buckets = namespaces.get(name);
  if (!buckets) {
    buckets = new Map();
    namespaces.set(name, buckets);
  }
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return false;
  }
  b.count += 1;
  return b.count > opts.max;
}

/**
 * Best-effort client identity from proxy headers. Prefer `x-real-ip` (set by the
 * Vercel edge, not client-overridable) over the leftmost `x-forwarded-for` (which
 * a client can spoof to mint a fresh bucket per request and evade the limit).
 */
export function clientKey(c: { req: { header: (k: string) => string | undefined } }): string {
  return (
    c.req.header("x-real-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// One Ratelimit per (name, max, windowMs), cached so the ephemeralCache survives
// across requests on a warm instance and blocked hot keys skip the Redis round-trip.
const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, opts: { max: number; windowMs: number }): Ratelimit {
  const cacheKey = `${name}:${opts.max}:${opts.windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      // getRedis() is non-null here (enforce checks first); cast for the typed ctor.
      redis: getRedis()!,
      limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowMs} ms`),
      prefix: rk("rl", name),
      ephemeralCache: new Map<string, number>(),
      analytics: false,
      timeout: 1000, // slow Redis → resolve as allowed rather than block the request
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// @hono/node-server provides no executionCtx; on Vercel Fluid Compute it may. Flush
// the background ephemeral-cache sync when we can, else just let it run untracked.
function flushPending(c: Context, pending: Promise<unknown>): void {
  try {
    c.executionCtx.waitUntil(pending);
  } catch {
    void pending;
  }
}

/**
 * Distributed rate-limit check. Returns true when the caller is limited (same
 * polarity as rateLimit). Uses Upstash when configured; falls back to the
 * in-memory limiter when Redis is unset or the call throws — so a Redis outage
 * degrades to a per-instance speed bump and never 500s.
 */
export async function enforce(
  c: Context,
  name: string,
  opts: { max: number; windowMs: number },
): Promise<boolean> {
  const key = clientKey(c);
  if (!getRedis()) return rateLimit(name, key, opts);
  try {
    const { success, pending } = await getLimiter(name, opts).limit(key);
    flushPending(c, pending);
    return !success;
  } catch {
    return rateLimit(name, key, opts);
  }
}

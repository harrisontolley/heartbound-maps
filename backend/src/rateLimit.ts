// Best-effort in-memory rate limiter (per client key, fixed window). Same shape
// as the one guarding /track — used to blunt anonymous abuse of the unauthenticated
// write endpoints (/uploads/token, /checkout/session). In-memory means per-instance
// only; it's a speed bump, not a hard quota (a WAF/edge limit is the real defence).

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

/** Best-effort client identity from proxy headers (mirrors the /track limiter). */
export function clientKey(c: { req: { header: (k: string) => string | undefined } }): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

# Redis (Upstash)

Distributed state for the serverless, multi-instance world. The same Pinprint code
runs across many Vercel Fluid Compute instances, so anything held in module memory
(rate-limit counters, geocode caches, the Nominatim gate) is per-instance and breaks
at scale. Upstash Redis (REST/HTTP — no TCP pool, cold-start cheap) backs all of it,
and **every path degrades to the old in-memory behaviour when Redis is unset** so the
app keeps working and tests stay hermetic without keys.

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | backend **and** frontend | Upstash REST endpoint. Server-only — **never** `NEXT_PUBLIC_`. |
| `UPSTASH_REDIS_REST_TOKEN` | backend **and** frontend | Upstash REST token. Server-only — exposing it to the browser grants full DB access. |

One Upstash DB is currently shared by **dev / preview / prod**, so every key is
namespaced by environment via `rk()` (`pinprint:{prod|preview|dev}:…`, derived from
`VERCEL_ENV`). Without that, dev traffic would corrupt prod counters/caches.
**Follow-up:** provision a separate Upstash DB for dev to isolate fully.

The frontend reads these only in server code (the auth-proxy route handler). They are
not `NEXT_PUBLIC_`, so they never reach the browser bundle.

## Where the code lives

- `backend/src/redis.ts` — env-guarded client (`getRedis()` returns `null` when
  `UPSTASH_REDIS_REST_*` is unset), `isRedisConfigured()`, `keyPrefix()`/`rk()`
  (env-namespaced key builder), and `pingRedis()`.
- `backend/src/rateLimit.ts` — `enforce(c, name, { max, windowMs })`: Upstash
  `@upstash/ratelimit` sliding window (with `ephemeralCache` + `timeout`) that
  **falls back to the in-memory `rateLimit()`** when Redis is null or errors. Used by
  `POST /checkout/session` (30/60s), `POST /uploads/token` (60/60s), and `/track` (30/60s).
- `backend/src/nominatim.ts` — two-tier geocode cache (in-memory LRU L1 → Redis L2
  with TTLs) + `nominatimGate()`, a distributed gate so the **fleet-wide** upstream
  rate stays ~1 req/1.1s (Nominatim policy) instead of N× across instances.
- `backend/src/routes/checkout.ts` — `Idempotency-Key` flow (Redis `SET NX` claim +
  Stripe's own `idempotencyKey`) so a double-click/retry can't create a duplicate
  order/session.
- `backend/src/app.ts` → `registerRoutes()` — `redis` field of `GET /health/integrations`
  and a live `GET /health/redis` (PING).
- `frontend/src/lib/redis.ts` + `frontend/src/lib/rateLimit.ts` — minimal server-only
  mirror (workspace isolation; `packages/shared` is types-only). Powers brute-force
  protection on the auth proxy.
- `frontend/src/app/api/auth/[...path]/route.ts` — rate-limits credential POSTs
  (`sign-in` / `sign-up`, 10/60s per IP); leaves the high-frequency `GET /token`/`/session` alone.
- `frontend/src/app/cart/page.tsx` — generates a per-attempt `Idempotency-Key` (reset
  when the cart changes) and sends it on the checkout request.

## What it does

- **Distributed rate limiting** — limits hold across every instance, not per-instance.
  `clientKey()` prefers the non-spoofable `x-real-ip`.
- **Shared geocode cache + global Nominatim gate** — a query geocoded on one instance
  is reused everywhere (positive TTL 30d, negative 1d), and the upstream rate is
  coordinated fleet-wide to avoid a Nominatim ban.
- **Checkout idempotency** — at-most-one order/session per attempt key.
- **Auth brute-force protection** — credential endpoints are IP-limited.

## Key naming

Lowercase, colon-separated, env-prefixed (see the `redis-core` skill):

```
pinprint:{env}:rl:{name}:{ip}          # rate-limit buckets (@upstash/ratelimit prefix)
pinprint:{env}:geo:s:{query}           # geocode search results
pinprint:{env}:geo:r:{lat},{lng}       # geocode reverse results
pinprint:{env}:geo:nominatim:upstream  # distributed Nominatim gate
pinprint:{env}:idem:checkout:{key}     # checkout idempotency claim
pinprint:{env}:rl:auth:{ip}            # auth-proxy sign-in/sign-up limit
```

## Gotchas

- **Fail-open, never fail-closed.** Redis down/slow/null → limiters fall back to the
  in-memory speed bump, geocode falls back to LRU + upstream, idempotency is skipped.
  No path 500s because of Redis.
- **`enforce()` is async** — a missed `await` at a call site silently disables the
  limiter (a truthy promise). All three backend sites and the auth proxy `await` it.
- **Don't `JSON.stringify` before `set`.** `@upstash/redis` auto-serializes — pass the
  object/array directly and read with `get<T>()`. Pre-stringifying double-encodes.
- **Shared dev/prod DB → env-namespace every key** via `rk()` / the Ratelimit `prefix`.
- **`getRedis()` caches a singleton** (like `db.ts`). In tests, assert the unconfigured
  (`null`) path before any configured call, or the cached client survives env deletion.
- **`pending` promise + Fluid Compute.** `@hono/node-server` provides no
  `executionCtx`, so `flushPending` guards `waitUntil` and falls back to `void pending`.
- **The token is server-only.** Never add `NEXT_PUBLIC_`; never import `lib/redis.ts`
  from a `"use client"` file.

## Verify

```bash
# Hermetic suites (Redis unset → in-memory fallback path):
pnpm --filter @pinprint/backend test:run
pnpm --filter @pinprint/frontend test:run

# Readiness / liveness:
curl -s localhost:8787/health/integrations   # { "redis": true|false, ... }
curl -s localhost:8787/health/redis           # { "ok": true } when reachable

# Rate limit (shared across both mounts): loop >30× and expect a 429
for i in $(seq 1 40); do \
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8787/track \
  -H 'content-type: application/json' -d '{"orderNumber":"PP-NOPE0","email":"x@y.com"}'; done | sort | uniq -c

# Idempotency: same key twice → identical { url }, one order created
curl -s -X POST localhost:8787/checkout/session -H 'content-type: application/json' \
  -H 'Idempotency-Key: demo-123' -d '{"items":[...]}'
```

Keys appear in the Upstash console under the `pinprint:{env}:…` prefix.

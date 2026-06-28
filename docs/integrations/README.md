# Integrations

Canonical reference for every third-party service Pinprint talks to. **Read the
relevant file here before writing or changing integration code** — it records the
env vars, the test/sandbox setup, where the code lives, the known footguns, and
the exact command to verify your change.

| Service | What it does | Doc | Server code | Client code |
| --- | --- | --- | --- | --- |
| **Neon** | Postgres database | [neon.md](./neon.md) | `backend/src/db.ts` | — |
| **Neon Auth** | Accounts, sessions, Google sign-in | [neon-auth.md](./neon-auth.md) | `backend/src/auth.ts` | `frontend/src/lib/auth/*` |
| **Stripe** | Payments | [stripe.md](./stripe.md) | `backend/src/stripe.ts` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Stripe.js, later) |
| **Artelo** | Print-on-demand fulfilment | [artelo.md](./artelo.md) | `backend/src/artelo.ts`, `backend/src/fulfillment.ts` | `frontend/src/lib/upload/*` |
| **PostHog** | Analytics, replay, flags, errors | [posthog.md](./posthog.md) | optional | `frontend/src/app/providers.tsx` |

Operator tooling (refunds, cancel, retry, observability) lives in the admin dashboard —
see [../admin.md](../admin.md). Secrets workflow for all of them: [secrets.md](./secrets.md).

## Three rules that keep this codebase safe and typed

1. **Secrets live only in the backend.** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `ARTELO_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL` are read from `process.env` in `backend/src/*`
   and never imported into `frontend/`. The browser only ever sees `NEXT_PUBLIC_*`
   values (publishable keys, the PostHog project key) — these are designed to be
   public.

2. **Anything that crosses the wire is typed in `packages/shared`.** Order shapes,
   webhook-derived statuses, anything the frontend reads from the backend goes in
   `packages/shared/src/index.ts` so both sides share one source of truth (the
   `GeoResult` type is the existing example).

3. **Integrations follow the `db.ts` pattern: lazy, env-guarded, null when
   unconfigured.** A missing key is never a crash — `getStripe()` / `getArteloConfig()`
   return `null` exactly like `getSql()`, and `/health/integrations` reports what is
   configured. This keeps the app buildable and the tests hermetic without any keys.

## Current state

Stripe Checkout and Artelo fulfilment are **wired into the order flow**: a paid order is
submitted to Artelo (see [artelo.md](./artelo.md)), with status callbacks advancing the
order and a `fulfillments` audit/COGS table for observability. PostHog is client-side
provider wiring. Each integration still follows the env-guarded `db.ts` pattern, so the
app builds and tests stay hermetic without keys.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

All run from the repo root (Turborepo fans out across workspaces):

```bash
pnpm dev          # frontend :3000 + backend :8787 together
pnpm build        # production build of every workspace
pnpm typecheck    # tsc --noEmit across all workspaces
pnpm lint         # ESLint (frontend only — backend/shared have no lint script)
pnpm test         # all Vitest suites once (turbo run test:run)
```

Scope to one workspace, or run a single test file, with `pnpm --filter`:

```bash
pnpm --filter @heartbound/backend test:run                        # one workspace
pnpm --filter @heartbound/frontend exec vitest run src/lib/geo/bearing.test.ts   # one file
pnpm --filter @heartbound/frontend exec vitest run -t "great-circle"            # one test by name
```

`/verify-integration` runs the full suite + the integration readiness check; `/env-pull` pulls secrets from Vercel.

## Architecture

A pnpm + Turborepo monorepo with three workspaces. The defining decisions span multiple files:

**Frontend/backend split, one Vercel domain.** `frontend/` (Next.js 16 App Router) and `backend/` (Hono API) deploy as a *single* Vercel project using Services (`vercel.json` → `experimentalServices`): frontend at `/`, backend at `/_/backend`, same origin. Consequences worth internalizing before editing routing:

- The backend registers every route **twice** — at `/` and at `SERVICE_PREFIX` (`/_/backend`) — because Vercel does not strip the prefix (see `registerRoutes()` in `backend/src/app.ts`). Add new routes inside that function so both mounts get them; cover both in tests (`app.request("/_/backend/...")`).
- The frontend reaches the backend via `BACKEND_URL` (`frontend/src/lib/api.ts`): Vercel injects `NEXT_PUBLIC_BACKEND_URL=/_/backend` in prod (no CORS); locally it's `http://localhost:8787` and the backend enables CORS.
- `packages/shared` (`@heartbound/shared`) is the **single source of truth for anything crossing the wire** (the `GeoResult` contract today). Frontend-only types live in `frontend/src/lib/types.ts` and re-export from shared.

**The poster engine lives entirely in the frontend** under `frontend/src/lib` — pure, unit-tested modules (`geo`, `layout`, `templates`, `affiliations`, `export`) plus a pure SVG renderer in `components/poster` shared by the live preview and the export. The layout engine treats the arrow *angle* (true bearing) as sacred and only adjusts length/nudge to resolve label collisions. State is a zustand store (`lib/store`). The backend never touches these libs. **Read `frontend/README.md` for how the rendering/layout internals work** before changing geometry, layout, or export. (Note: that file predates the backend split and still describes geocoding as a Next.js route — it actually lives in `backend/src/nominatim.ts` now.)

**Backend service** (`backend/src/`): `app.ts` is the Hono app; `nominatim.ts` is the geocoding proxy (descriptive User-Agent, ≥1.1s rate gate, in-memory LRU); `db.ts` is the Neon client; `server.ts` is the local-dev entry (`@hono/node-server`, loads `.env`). On Vercel the app's default export is the function handler — there is no `server.ts` in prod.

**Integration pattern (Stripe, Artelo, PostHog, Neon).** Server-side clients are lazy, module-scoped, and **env-guarded — they return `null` when their key is unset** (`getSql`/`getStripe`/`getArteloConfig`), so the app always builds and tests stay hermetic without keys. `GET /health/integrations` reports what's configured. Secrets are read only in `backend/src/*`; the browser only ever sees `NEXT_PUBLIC_*`. **Before writing or changing integration code, read the relevant file in `docs/integrations/`** — they hold env vars, sandbox setup, gotchas (e.g. Stripe webhook signatures need the *raw* body), and the verify command. PostHog is wired client-side in `frontend/src/app/providers.tsx` and proxied through `/ingest` (rewrite in `next.config.ts`) to dodge ad blockers; it no-ops without a key.

**Admin & observability.** Operator tooling (order lookup, refund, cancel, retry-fulfilment, sync, address) lives behind `requireAdmin` — a verified Neon Auth session whose email is on the `ADMIN_EMAILS` allowlist (`backend/src/routes/admin.ts`, dashboard at `frontend/src/app/admin`). Every inbound Stripe/Artelo webhook is logged to `webhook_events` (raw payload, signature validity, `event_id`-deduped so re-deliveries don't re-run side effects; a handler error 500s so the provider retries), every Artelo submission to `fulfillments` (request/response + COGS), every admin mutation to `admin_actions`. **Read `docs/admin.md`** before touching admin/observability.

**Secrets** live in Vercel (source of truth), pulled per workspace with `vercel env pull`. Never commit real keys — a `.githooks/pre-commit` scanner (enable once: `git config core.hooksPath .githooks`) and a CI step block key-shaped strings. See `docs/integrations/secrets.md`.

## Important constraints

- **Next.js 16 is not the version in your training data** — read the guides in `node_modules/next/dist/docs/` before writing App Router / Next code (see `AGENTS.md`).
- Keep PRs focused; CI runs `typecheck → lint → test → build` and must stay green (`.github/workflows/ci.yml`).

## Pre-launch TODO

- ~~Set `NEXT_PUBLIC_SITE_URL`~~ **DONE 2026-07-08**: the production domain is `https://heartboundmaps.com` (bought on Vercel, nameservers live) and `NEXT_PUBLIC_SITE_URL` is set in Vercel Production — the site goes fully indexable on the next production deploy. `frontend/src/lib/seo/site.ts` still treats an unset var as "not launched" (sitewide noindex + robots disallow-all), so never delete the var casually, and do NOT set it in Preview — previews must stay noindexed.
- **Rebrand follow-ups (Pinprint → Heartbound Maps, 2026-07-08)** — external services still on the old name: (1) Resend — `EMAIL_FROM` should move to an `@heartboundmaps.com` address once the domain is verified in Resend (DNS records via Vercel DNS); until then transactional email sends from the old domain. (2) Neon Auth — allowed origin/trusted domain must include `https://heartboundmaps.com` or account login breaks on the new domain (Origin-header + `iss` gotchas in `docs/integrations/neon-auth.md`). (3) Sentry — org/project slugs are still `pinprint`/`pinprint-frontend`; the code intentionally keeps them (see `frontend/next.config.ts`) until the Sentry-side projects are renamed. (4) The Stripe webhook endpoint (below) must be registered against `https://heartboundmaps.com/_/backend/webhooks/stripe`.
- ~~`STRIPE_WEBHOOK_SECRET`~~ **DONE 2026-07-08**: live webhook endpoint `we_1TqurIR7frRQ6vdr4kmYljTu` registered at `https://heartboundmaps.com/_/backend/webhooks/stripe` (note the `/_/backend` service prefix — the root path 404s) with the 6 events `handleStripeEvent` switches on, and its signing secret is set as `STRIPE_WEBHOOK_SECRET` in Vercel Production. Activates on the next production deploy. Remaining before real orders: the end-to-end live test purchases in `docs/integrations/stripe.md` go-live checklist step 4 (one per frame material), then flip `ARTELO_TEST_ORDERS=false`.
- **Neon compute is pinned at `autoscaling_limit_min_cu = autoscaling_limit_max_cu = 0.25`** (verified 2026-07-03 via the Neon MCP `list_branch_computes` tool) — no autoscaling headroom for concurrent traffic or the CPU-heavy print-render path (`backend/src/renderPrint.ts`, resvg at 300 DPI). Scale-to-zero is active (`suspend_timeout_seconds: 300`), so this is cheap while idle, but the max should be raised before real launch traffic. Neon console/API change, not a code change.
- **`MAPTILER_API_KEY` is not set in Vercel Production** (`GET /health/integrations` → `maptiler: false`). Geocoding still works — `backend/src/nominatim.ts` falls back to the free public Nominatim API when unset — but that free tier has a stricter usage policy and no SLA/rate-limit headroom compared to the MapTiler-backed path. Worth adding before a traffic spike (e.g. a launch announcement), not strictly required to function.

# Neon Auth (accounts + sessions)

Managed authentication built on **Better Auth**, provisioned per Neon branch. Powers
Google + email/password sign-in, the account section, and the authenticated backend
API. Provisioning creates a `neon_auth` schema (users, sessions, jwks, …) in the same
Neon database as our app tables — **we never touch or migrate `neon_auth`**; the auth
user id is stored as a plain `text user_id` on our tables.

## How it fits the frontend/backend split

Neon Auth runs **in the Next.js app**; the Hono backend is a separate service. They
trust each other via a **Bearer JWT**, not a shared cookie:

1. The browser signs in through `/api/auth/*` (the Next handler proxies to Neon Auth and
   signs the session cookie).
2. To call the backend, the client attaches a Neon Auth **JWT** as
   `Authorization: Bearer …` (`authClient.getJWTToken()`, wrapped in `lib/apiClient.ts`).
3. The backend verifies that JWT **offline** against Neon Auth's JWKS (`backend/src/auth.ts`,
   using `jose`) and extracts the user id from `sub`.

Why Bearer (not cookie forwarding): in local dev the frontend (`:3000`) and backend
(`:8787`) are cross-origin, so the auth cookie is never sent to the backend. A Bearer
header is explicit and works identically in dev and prod.

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `NEON_AUTH_BASE_URL` | frontend (server) | Auth base, e.g. `https://<branch>.neonauth.<region>.aws.neon.tech/<db>/auth`. From `provision_neon_auth`. |
| `NEON_AUTH_COOKIE_SECRET` | frontend (server) | 32+ char secret signing the session-data cookie. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `NEON_AUTH_JWKS_URL` | backend | `…/<db>/auth/.well-known/jwks.json`. Public keys the backend verifies tokens against. |
| `NEON_AUTH_ISSUER` | backend | Expected `iss` claim. **The host origin only** (`https://<branch>.neonauth.<region>.aws.neon.tech`) — *not* the base_url with the `/<db>/auth` path. Optional; blank skips the check. |

No `NEXT_PUBLIC_*` auth var is needed: the client talks to the same-origin `/api/auth`
proxy. Secrets stay server-side, matching the repo's "secrets only in the backend" rule.

## Where the code lives

- `frontend/src/lib/auth/server.ts` — `createNeonAuth({ baseUrl, cookies:{ secret } })`; `null` when env is unset (build stays hermetic).
- `frontend/src/app/api/auth/[...path]/route.ts` — `auth.handler()` → GET/POST (503 when unconfigured).
- `frontend/src/lib/auth/client.ts` — `createAuthClient()` (client); `useSession()`, `signIn.social()`, `getJWTToken()`.
- `frontend/src/app/auth-provider.tsx` — `NeonAuthUIProvider` (Google enabled), nested in `providers.tsx`. UI inherits design tokens via `@neondatabase/auth/ui/tailwind` (imported once in `globals.css`).
- `frontend/src/app/auth/[path]/page.tsx` — prebuilt `AuthView` pages (sign-in/up/etc.).
- `frontend/src/lib/apiClient.ts` — `apiFetch` attaches the Bearer token.
- `backend/src/auth.ts` — lazy JWKS (`jose`), `isAuthConfigured()`, `getUser`/`requireUser` middleware.

## Gotchas

- **`iss` is the host, not the base_url.** A real token's `iss` is `https://<branch>.neonauth…neon.tech` with no `/<db>/auth`. Setting `NEON_AUTH_ISSUER` to the full base_url rejects every real token.
- **Better Auth enforces Origin.** Direct API calls (scripts/tests against the base_url) must send an `Origin` header that's allowed (`allow_localhost` permits `http://localhost:3000`) or sign-up/sign-in returns 400/403.
- **JWTs are EdDSA (Ed25519).** Don't restrict `jose` to RS256.
- `requireUser` returns **401 `auth_unconfigured`** when `NEON_AUTH_JWKS_URL` is unset, so routes register and tests stay hermetic with no keys.
- Google in dev uses Neon's **shared OAuth keys** out of the box; production needs your own Google Cloud OAuth client configured in the Neon Console.
- `neon_auth` is owned by Neon Auth — never add it to our migrations or FK into it.

## Database

App tables (orders, addresses, profiles, rewards, …) live in `public`, applied by the
SQL runner: `pnpm --filter @heartbound/backend migrate`. Seed demo data with
`pnpm --filter @heartbound/backend seed [authUserId]`. See [neon.md](./neon.md).

## Verify

```bash
curl -s localhost:8787/health/integrations          # { …, "auth": true } when JWKS is set
curl -s localhost:8787/account/orders                # 401 (no token)
# Real token: sign in via the app, or mint one through the Better Auth API
# (POST <base>/sign-up/email with an Origin header → GET <base>/token), then:
curl -s localhost:8787/account/orders -H "authorization: Bearer <jwt>"
```

## MCP / provisioning

Provisioned via the Neon MCP (`provision_neon_auth` → returns base_url + jwks_url;
`get_neon_auth_config` shows OAuth providers). Project: `square-bird-24031932` (`heartbound`).

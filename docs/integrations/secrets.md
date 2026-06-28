# Secrets & environment

**Source of truth: Vercel project environment variables.** Local `.env` files are
disposable copies pulled from Vercel. Nothing secret is committed — only the
`*.env.example` templates.

## One-time setup

```bash
npm i -g vercel        # the Vercel CLI
vercel login
vercel link            # link this repo to the Vercel project (creates .vercel/, gitignored)
```

## Pulling secrets locally

Pull per service (each workspace loads its own `.env`):

```bash
vercel env pull backend/.env       # DATABASE_URL, STRIPE_*, ARTELO_*, BLOB_READ_WRITE_TOKEN, POSTHOG_*
vercel env pull frontend/.env      # NEXT_PUBLIC_* values
```

Or use the slash command: **`/env-pull`**.

`backend/src/server.ts` loads `backend/.env` in dev via `process.loadEnvFile(".env")`.
Next.js auto-loads `frontend/.env`. In production Vercel injects the vars directly —
no `.env` is used.

## Adding a new secret

1. Add it in the **Vercel dashboard** (Project → Settings → Environment Variables),
   choosing the environments it applies to (Production / Preview / Development).
2. Add the **name only** (empty value + a comment) to the matching `*.env.example`.
3. Re-pull locally (`/env-pull`).
4. Read it via `process.env.NAME` in `backend/src/*`. If it must reach the browser it
   has to be prefixed `NEXT_PUBLIC_` **and** be safe to expose — if it is a secret,
   it does not belong on the client.

## Which keys are secret vs public

| Secret (backend only) | Public (`NEXT_PUBLIC_*`, may ship to browser) |
| --- | --- |
| `DATABASE_URL` | `NEXT_PUBLIC_BACKEND_URL` |
| `STRIPE_SECRET_KEY` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `NEXT_PUBLIC_POSTHOG_KEY` |
| `ARTELO_API_KEY` | `NEXT_PUBLIC_POSTHOG_HOST` / `_UPSTREAM` |
| `ARTELO_WEBHOOK_SECRET` | |
| `BLOB_READ_WRITE_TOKEN` | |
| `ADMIN_EMAILS` (operator allowlist) | |
| `POSTHOG_PROJECT_API_KEY` | |
| `POSTHOG_PERSONAL_API_KEY` (for the PostHog MCP) | |

## Guardrails

- `.env` and `.env.*` (except `.env.example`) are gitignored.
- A pre-commit hook (`.githooks/pre-commit`) blocks commits containing key-shaped
  strings (`sk_live`, `sk_test`, `whsec_`, `rk_`, `pk_live`, `phc_`). CI runs the same
  scan. Enable the hook once with: `git config core.hooksPath .githooks`.

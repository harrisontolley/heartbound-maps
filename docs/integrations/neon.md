# Neon (Postgres)

Hosted serverless Postgres. Backs `/health/db`, **Neon Auth** (see
[neon-auth.md](./neon-auth.md)), and the account-system tables (orders, addresses,
profiles, rewards). Auth tables live in the `neon_auth` schema (owned by Neon Auth);
our app tables live in `public`.

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | backend | Pooled connection string from the Neon dashboard. |

## Where the code lives

- `backend/src/db.ts` — `getSql()` (lazy `@neondatabase/serverless` client, `null` when
  `DATABASE_URL` is unset) and `pingDb()` (`select 1`). This is the **pattern** every
  other integration follows.
- `backend/src/app.ts` — `GET /health/db` and the `db` field of `/health/integrations`.
- `backend/migrations/*.sql` + `backend/src/migrate.ts` — a tiny SQL migration runner
  (numbered files, tracked in `_migrations`, applied in one transaction each; no-ops
  without `DATABASE_URL`). Run: `pnpm --filter @heartbound/backend migrate`.
- `backend/src/orders.ts`, `backend/src/accountStore.ts` — query modules (raw `sql\`…\``).
- `backend/src/seed.ts` — demo data: `pnpm --filter @heartbound/backend seed [authUserId]`.

## Gotchas

- Use the **pooled** connection string for serverless (the one with `-pooler` in the
  host), not the direct one.
- The Neon project scales to zero; the first query after idle has a brief cold start.
- `getSql()` returns `null` when unconfigured — callers must handle it (as `pingDb`
  does), never assume a client.

## Verify

```bash
curl -s localhost:8787/health/db            # { "ok": true } when DATABASE_URL is set
curl -s localhost:8787/health/integrations  # { "db": true|false, ... }
```

## MCP

The Neon MCP server is in `.mcp.json` (`https://mcp.neon.tech/mcp`) — inspect branches,
tables, and run SQL against the project from the agent session. Prefer a Neon **branch**
for any schema experimentation so `main` stays clean.

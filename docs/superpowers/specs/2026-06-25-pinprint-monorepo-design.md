# Pinprint → professional monorepo — design

**Date:** 2026-06-25
**Status:** Approved
**Branch:** `feat/monorepo`

## Goal

Refactor the single full-stack Next.js app into a professional, public monorepo:
a `frontend/` Next.js UI plus a separate `backend/` API service, a hosted Neon
database wired but feature-less for now, CI + standard OSS hygiene, and a Vercel
deployment.

## Decisions (from brainstorming)

- **Structure:** `frontend/` (Next UI) + `backend/` (API service) split, plus a
  tiny `packages/shared` for the API contract type. The pure libs
  (`geo`, `layout`, `templates`, `export`) stay in `frontend/` — the backend
  never touches them (YAGNI; extract to `packages/core` only if ever shared).
- **Backend framework:** Hono (Node/TS) — tiny, TS-first, native on Vercel
  Functions, runs locally via `@hono/node-server`. Chosen over Python so the
  monorepo keeps one toolchain and an end-to-end-typed API contract.
- **Database:** Neon, hosted and wired (`@neondatabase/serverless`), exercised
  only by a `/health/db` `SELECT 1`. No ORM, schema, or migrations yet.
- **Frontend ↔ backend wiring:** Next.js rewrites proxy `/api/geocode/*` to
  `${BACKEND_URL}/geocode/*`, so existing client hooks stay unchanged and there
  is no CORS / second public origin.
- **Tooling:** pnpm workspaces + Turborepo (`build`/`lint`/`test`/`typecheck`).
- **License:** MIT. **Visibility:** flip GitHub repo private → public.

## Target layout

```
pinprint/
├─ frontend/              # existing Next.js app, moved wholesale
│  ├─ src/ ...            # app, components, hooks, lib (geo/layout/templates/export)
│  ├─ next.config.ts      # + rewrites /api/geocode/* → ${BACKEND_URL}/geocode/*
│  └─ package.json, tsconfig.json, vitest.config.ts, .env.example
├─ backend/               # new Hono API service
│  ├─ src/app.ts          # routes: /geocode/search, /geocode/reverse, /health, /health/db
│  ├─ src/nominatim.ts    # moved from frontend lib/server (UA, rate gate, LRU — intact)
│  ├─ src/db.ts           # @neondatabase/serverless client (only /health/db uses it)
│  ├─ src/server.ts       # @hono/node-server for local dev (port 8787)
│  ├─ api/index.ts        # Vercel entry: handle(app)
│  └─ package.json, tsconfig.json, .env.example
├─ packages/shared/       # GeoResult + API contract (single source of truth)
├─ package.json           # root, private, workspaces, turbo scripts
├─ pnpm-workspace.yaml    turbo.json
├─ .github/workflows/ci.yml   .github/pull_request_template.md
└─ README.md  LICENSE  CONTRIBUTING.md  .gitignore  .env.example
```

## API contract

`GeoResult` moves to `@pinprint/shared`; `frontend/src/lib/types.ts` re-exports
it. Backend imports it directly. Endpoints (unchanged shapes):

- `GET /geocode/search?q=` → `GeoResult[]`
- `GET /geocode/reverse?lat=&lon=` → `GeoResult | null`
- `GET /health` → `{ ok: true }`
- `GET /health/db` → `{ ok: boolean }` (runs `SELECT 1` if `DATABASE_URL` set)

## Implementation plan (ordered, low-risk first)

1. **Scaffold root:** root `package.json`, `pnpm-workspace.yaml`, `turbo.json`,
   monorepo `.gitignore`.
2. **Relocate app** into `frontend/` (git mv; product README → `frontend/README.md`).
   Bar: `pnpm --filter frontend test:run` + `typecheck` + `build` pass.
3. **`packages/shared`** with `GeoResult`; re-export from frontend types.
4. **`backend/`** (Hono): move `nominatim.ts`, add routes + `db.ts` + dev server
   + Vercel entry; backend Vitest for normalize/cache + `/health`.
5. **Wire frontend** rewrites + `.env.example` (`BACKEND_URL`); verify search
   end-to-end locally.
6. **Neon:** provision project, capture pooled connection string, set
   `backend/.env`; `/health/db` returns ok.
7. **Hardening:** root README, MIT LICENSE, CONTRIBUTING, CI workflow, PR
   template, `.env.example`.
8. **Vercel:** two projects (`frontend/`, `backend/`) from the repo; env
   `DATABASE_URL` (backend), `BACKEND_URL` (frontend); needs user auth.
9. **Public:** `gh repo edit --visibility public`.

## Verification bar

- `pnpm turbo run typecheck lint test build` green across all workspaces.
- Local: `pnpm dev` runs frontend + backend; place search returns results
  through the rewrite; `/health/db` returns `{ ok: true }`.

## Out of scope

DB schema/migrations/ORM, accounts/auth, save-share, gallery, payments.

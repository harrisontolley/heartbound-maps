# Contributing to Pinprint

Thanks for your interest in improving Pinprint!

## Getting set up

```bash
pnpm install
pnpm dev          # frontend on :3000, backend on :8787
```

Requires Node `>=20` and pnpm (see `packageManager` in `package.json`).

## Before opening a pull request

Run the full check suite from the repo root — CI runs the same:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Project layout

- `frontend/` — Next.js app (Poster Studio UI, rendering, export).
- `backend/` — Hono API (geocoding proxy, Neon health check).
- `packages/shared/` — types shared across the API boundary.

## Guidelines

- Keep the API contract in `packages/shared` as the single source of truth for
  data crossing the frontend/backend boundary.
- Add or update tests alongside the code you change.
- Match the surrounding code style; ESLint and TypeScript are enforced in CI.
- Keep pull requests focused — one logical change per PR.

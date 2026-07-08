# Heartbound Maps

Poster maps of the places that matter. Pick a **home** location, add the places
you have ties to (born / lived / visited / family), and Heartbound Maps renders a
portrait poster with an **arrow pointing in each place's true compass bearing**
from home, labeled with the great-circle distance — across switchable designs,
with no overlapping labels. Export to SVG or print-quality PNG.

> Product walkthrough and the rendering/layout internals live in
> [`frontend/README.md`](frontend/README.md).

## Monorepo layout

| Path               | What it is                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| `frontend/`        | Next.js 16 app — the Poster Studio UI and the SVG/PNG export pipeline. |
| `backend/`         | Hono API service — the Nominatim geocoding proxy and a Neon health check. |
| `packages/shared/` | Types shared across the frontend/backend boundary (the API contract).  |

Managed with **pnpm workspaces** + **Turborepo**.

## Quick start

```bash
pnpm install
cp frontend/.env.example frontend/.env   # NEXT_PUBLIC_BACKEND_URL=http://localhost:8787
cp backend/.env.example backend/.env     # DATABASE_URL optional for now
pnpm dev                                 # frontend :3000  +  backend :8787
```

In dev the Studio calls the backend at `NEXT_PUBLIC_BACKEND_URL`
(`http://localhost:8787`), and the backend enables CORS for that cross-origin
call. In production both run on one domain, so the calls are same-origin.

## Scripts (run from the repo root)

| Script           | What it does                                          |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | Runs the frontend and backend together (Turborepo).  |
| `pnpm build`     | Production build of every workspace.                 |
| `pnpm test`      | Runs all workspace test suites once (Vitest).        |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces.               |
| `pnpm lint`      | ESLint across all workspaces.                        |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · zustand ·
react-leaflet + OpenStreetMap · Hono · Neon (Postgres) · Nominatim · Vitest ·
Turborepo · Vercel.

## Deployment

Deployed to Vercel as a **single project using Services** (`experimentalServices`
in `vercel.json`): the `frontend` Next.js app at `/` and the `backend` Hono
service at `/_/backend`, sharing one domain. Vercel injects
`NEXT_PUBLIC_BACKEND_URL=/_/backend` for the client automatically; set
`DATABASE_URL` (Neon) once at the project level.

## License

[MIT](LICENSE) © Harrison Tolley

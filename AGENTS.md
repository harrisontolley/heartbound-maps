<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:pinprint-integration-rules -->
# Integrations

This repo integrates Stripe, Artelo, PostHog, and Neon. **Before writing or changing any integration code, read `docs/integrations/README.md`** plus the per-service file — they hold the env vars, sandbox setup, where code lives, and the gotchas.

Non-negotiables:

- Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ARTELO_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`) are read only in `backend/src/*`; the browser sees only `NEXT_PUBLIC_*`.
- Data crossing the frontend/backend boundary is typed in `packages/shared`.
- Integration clients are lazy + env-guarded (return `null` when unconfigured), mirroring `backend/src/db.ts`. Check `GET /health/integrations`.
- Stripe webhook signatures verify against the **raw** request body — never parse first.
<!-- END:pinprint-integration-rules -->

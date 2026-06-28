---
description: Run the full check suite and report integration readiness
---

Verify the harness end to end and report a concise pass/fail summary. Do not fix
anything unless I ask.

1. Run the full suite from the repo root and report each result:

   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```

2. If a backend dev server is running on :8787, check integration readiness:

   ```bash
   curl -s http://localhost:8787/health/integrations
   ```

   Report the JSON (`{ db, stripe, artelo, auth }` booleans). If the server is not
   running, say so — don't start it unless I ask.

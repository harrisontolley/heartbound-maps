# Admin & operations

Operator tooling for managing orders, refunds, fulfilment, and observability. The
dashboard lives at **`/admin`** (frontend) and is backed by the **`/admin/*`** API
(`backend/src/routes/admin.ts`). Everything here is gated by an email allowlist.

## Access (ADMIN_EMAILS allowlist)

Admin is a normal signed-in Neon Auth session **plus** an email on the server-side
allowlist. There is no separate admin login.

| Var | Where | Notes |
| --- | --- | --- |
| `ADMIN_EMAILS` | backend | Comma/space-separated emails. A request is admin only if its verified JWT email is in this set. Unset ⇒ admin is **closed** (every `/admin/*` route 403s). |

- Middleware: `requireAdmin` (`backend/src/auth.ts`) — 401 if unauthenticated, **403** if the
  verified email isn't on `ADMIN_EMAILS`. The client UI gate (`/admin` layout) is cosmetic; the
  server enforces every route, so a non-admin can't reach the data even by typing the URL.
- `GET /health/integrations` reports `admin: true|false` (whether an allowlist is configured).
- Add yourself: set `ADMIN_EMAILS=you@example.com` in Vercel (backend) and locally in `backend/.env`.
- **Security note:** admin is the email claim on a *signature-verified* JWT, and an explicitly
  unverified email (`email_verified:false`) is rejected. The allowlist is only as strong as your
  identity provider — ensure Neon Auth requires **re-verification when a user changes their email**,
  so a known admin address can't be claimed without proving ownership.

## Dashboard

| Page | What |
| --- | --- |
| `/admin` | Metrics: gross revenue, refunds, Artelo COGS, net margin, failed-fulfilment count, test-order count, orders-by-status. |
| `/admin/orders` | Searchable/filterable table (by order #, email, status) with a per-order margin column. |
| `/admin/orders/[id]` | Full detail + actions + the forensic logs (timeline, **raw webhook log**, fulfilment attempts w/ COGS, admin-action audit). Keyed by the **internal order id**, not the public `HB-…` number. |

## API

All require `Authorization: Bearer <jwt>` for an allowlisted user. Registered at both
`/` and `/_/backend` (the dual-mount pattern).

| Method · path | Purpose |
| --- | --- |
| `GET /admin/me` | Cheap "am I admin?" probe (`{email, admin:true}`). |
| `GET /admin/orders?status=&search=&limit=&offset=` | List orders (newest first) + latest fulfilment outcome + margin. |
| `GET /admin/orders/:id` | Full detail (items, events, fulfillments, webhook_events, admin_actions). |
| `GET /admin/metrics` | Aggregate revenue / COGS / margin / failure counts. |
| `POST /admin/orders/:id/refund` | Body `{amountCents?, reason?}`. Stripe refund (full when amount omitted). Idempotency-keyed; records `amount_refunded_cents`; advances to `refunded` when fully refunded. |
| `POST /admin/orders/:id/cancel` | Body `{refund?, reason?}`. Cancels the Artelo order (if any), optionally refunds, marks `cancelled`. |
| `POST /admin/orders/:id/retry-fulfillment` | Clears the prior (failed) Artelo id and re-submits. |
| `POST /admin/orders/:id/sync` | Pulls `GET /orders/get-by-id` from Artelo and reconciles status/tracking. If the reconciled status is `shipped` or `delivered`, also fires the matching shipment notification email (same as the Artelo webhook would) — idempotent via the `shipped_email_sent_at`/`delivered_email_sent_at` claim columns, so a sync that races an already-processed webhook (or a repeat sync) never double-sends. |
| `PATCH /admin/orders/:id/address` | Updates the **local** shipping address (Artelo has no edit endpoint — see below). |

Every mutation writes an `admin_actions` audit row (`actor_email`, `action`, `detail`).

## Observability tables (for backend investigation)

- **`webhook_events`** — raw inbound log for every Stripe/Artelo webhook: `provider`, `event_type`,
  `event_id` (unique → idempotency), `signature_valid`, `processing_status`
  (`received`/`processed`/`ignored`/`error`), `error`, `payload`, `received_at`. This is the forensic
  record; dedupe keys on **successful processing**, so a transient handler failure 500s and the
  provider's retry reprocesses (no silently-lost events). `processing_status = 'processed'` only means
  the *order status* advanced (e.g. to `paid`) — the paid-transition side effects (Artelo submit,
  digital-delivery email) are deferred past the webhook's response and run afterward, so check
  `fulfillments` / `order_events` for their actual outcome, and note the hourly
  `/jobs/fulfillment-sweep` cron re-runs both for any `paid` order still missing one after 15 minutes.
- **`fulfillments`** — one row per Artelo submission attempt: request/response, `is_test`,
  `attempt_count`, and COGS (`production/shipping/tax_cents`).
- **`admin_actions`** — who did what to which order.
- **`orders`** lifecycle timestamps — `paid_at`, `cancelled_at`, `refunded_at`, `amount_refunded_cents`,
  `artelo_submitted_at`, `artelo_status`.
- **`order_events`** — the human-facing status timeline.

## Runbooks

**Refund a customer.** `/admin/orders/:id` → enter an amount (blank = full) → Refund. Stripe processes
it; the `charge.refunded` webhook reconciles `amount_refunded_cents` (cumulative, idempotent). Full
refunds flip status to `refunded`; partials stay in the fulfilment state with a timeline note.

**A fulfilment failed (Artelo down / bad data).** The order shows "fulfilment failed" and appears in the
metrics "failed fulfilments" count. Fix the cause if needed, then **Retry fulfilment**. It clears the
failed Artelo id and re-submits; the new attempt is logged. Note it's a synchronous server render on
textured templates — the request can take **~35 s** before the dashboard shows the result; don't assume
it's stuck and re-click.

**Cancel an order.** **Cancel + refund** cancels the Artelo order *if it's still cancellable*
(pre-production) and refunds via Stripe. If Artelo refuses (already in production, or a test order),
the response is recorded and the order is still refunded + marked `cancelled` locally — then contact
Artelo support if a real production order must be stopped.

**Wrong shipping address.** Artelo can't edit an address after submission. If the order is **pre-
production**, Cancel + re-create with the right address. Edit address updates our record for reference
only.

**Reconcile a stuck status.** **Sync from Artelo** pulls the live order and updates our status/tracking
— useful if a status webhook was missed.

## Live end-to-end test runbook

Prereqs in `backend/.env`: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `ARTELO_API_KEY` (+ keep
`ARTELO_TEST_ORDERS=true` so nothing is produced), `BLOB_READ_WRITE_TOKEN` (needs a provisioned Vercel
Blob store), `ADMIN_EMAILS=<you>`. Frontend `NEXT_PUBLIC_BACKEND_URL=http://localhost:8787`.

1. `pnpm --filter @heartbound/backend migrate` (applies 0001–0003).
2. `pnpm dev` (frontend :3000 + backend :8787).
3. `stripe listen --forward-to localhost:8787/webhooks/stripe` → copy the `whsec_…` into
   `STRIPE_WEBHOOK_SECRET` and restart the backend.
4. `curl localhost:8787/health/integrations` → `db/stripe/artelo/auth/admin` all `true`.
5. Studio → design a poster → add to cart → checkout → pay with Stripe test card `4242 4242 4242 4242`.
6. Watch: `checkout.session.completed` → order `paid` → `submitOrderToArtelo` → a `fulfillments` row
   with COGS + an `artelo_order_id`. Verify on `/track` and in `/admin/orders/:id`.
7. Artelo status webhooks can't reach `localhost` — either test against a Vercel preview deploy, or POST
   a correctly-signed `OrderStatusChange` payload to `/webhooks/artelo`.
8. Exercise admin: Refund, Cancel, Retry, Sync against the test order; confirm each writes an
   `admin_actions` row and the Stripe dashboard reflects the refund.

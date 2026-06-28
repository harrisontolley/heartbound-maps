-- 0003_observability.sql — capture everything needed for backend investigation,
-- logging and observability of the order/fulfilment lifecycle.
--
-- Three additions, all additive and idempotent (IF [NOT] EXISTS):
--   1. webhook_events — a raw inbound log for EVERY Stripe/Artelo webhook, with a
--      provider-scoped unique event id so re-deliveries are deduped (idempotency:
--      Stripe retries on non-2xx, Artelo retries up to ~20×). This is the forensic
--      record — exactly what arrived, whether the signature was valid, and how we
--      processed it — distinct from the human-facing `order_events` timeline.
--   2. Order lifecycle timestamps + refund total on `orders`, so "when did this
--      order get paid / cancelled / refunded, and how much was refunded" is a
--      column read rather than an event-log scan.
--   3. admin_actions — an audit trail: who (admin email) did what (refund/cancel/
--      retry/address) to which order, with the request detail.
--
-- Safe to re-run.

-- ── 1. Raw inbound webhook log (+ idempotency) ───────────────────────────────
create table if not exists webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,                    -- 'stripe' | 'artelo'
  event_type        text,                             -- e.g. 'checkout.session.completed' | 'OrderStatusChange'
  event_id          text,                             -- provider event id (stripe evt_…) or synthesised dedupe key
  signature_valid   boolean,                          -- did the HMAC/signature verify?
  order_id          uuid references orders(id) on delete set null,
  processing_status text not null default 'received', -- 'received' | 'processed' | 'ignored' | 'duplicate' | 'error'
  error             text,
  payload           jsonb,                            -- the exact body we received
  received_at       timestamptz not null default now()
);
-- One provider event processed once. Partial unique so rows without an event id
-- (shouldn't happen, but be safe) don't collide.
create unique index if not exists webhook_events_provider_event_uniq
  on webhook_events (provider, event_id) where event_id is not null;
create index if not exists webhook_events_order_id_idx on webhook_events (order_id, received_at desc);
create index if not exists webhook_events_received_idx on webhook_events (provider, received_at desc);

-- ── 2. Order lifecycle timestamps + refund tracking ──────────────────────────
alter table orders add column if not exists paid_at               timestamptz;
alter table orders add column if not exists cancelled_at          timestamptz;
alter table orders add column if not exists refunded_at           timestamptz;
alter table orders add column if not exists amount_refunded_cents integer not null default 0;

-- Backfill lifecycle timestamps from the existing event timeline so historical
-- orders aren't all-null (best-effort: earliest event of each status).
update orders o set paid_at = e.at from (
  select order_id, min(created_at) as at from order_events where status = 'paid' group by order_id
) e where e.order_id = o.id and o.paid_at is null;
update orders o set refunded_at = e.at from (
  select order_id, min(created_at) as at from order_events where status = 'refunded' group by order_id
) e where e.order_id = o.id and o.refunded_at is null;
update orders o set cancelled_at = e.at from (
  select order_id, min(created_at) as at from order_events where status = 'cancelled' group by order_id
) e where e.order_id = o.id and o.cancelled_at is null;

-- ── 3. Admin action audit trail ──────────────────────────────────────────────
create table if not exists admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_email text not null,                          -- the admin who acted (from ADMIN_EMAILS / verified JWT)
  action      text not null,                          -- 'refund' | 'cancel' | 'retry_fulfillment' | 'update_address' | 'sync' | 'note'
  order_id    uuid references orders(id) on delete set null,
  detail      jsonb,                                  -- request/result detail (amounts, reason, provider responses)
  created_at  timestamptz not null default now()
);
create index if not exists admin_actions_order_id_idx on admin_actions (order_id, created_at desc);
create index if not exists admin_actions_actor_idx on admin_actions (actor_email, created_at desc);

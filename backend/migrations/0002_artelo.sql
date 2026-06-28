-- 0002_artelo.sql — swap the print-fulfilment provider from Prodigi to Artelo.
--
-- Renames the provider-specific columns/enum value, adds a couple of Artelo
-- observability fields to `orders`, and introduces a `fulfillments` table that
-- logs every submission attempt (request/response + Artelo's cost breakdown) so
-- we can audit what was sent and track margin (retail total − Artelo COGS).
--
-- Idempotent/guarded (DO blocks + IF [NOT] EXISTS checks) so it's safe to re-run.

-- ── Renames: prodigi_* → artelo_* ────────────────────────────────────────────
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'orders' and column_name = 'prodigi_order_id')
     and not exists (select 1 from information_schema.columns
             where table_name = 'orders' and column_name = 'artelo_order_id') then
    alter table orders rename column prodigi_order_id to artelo_order_id;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'order_items' and column_name = 'prodigi_sku')
     and not exists (select 1 from information_schema.columns
             where table_name = 'order_items' and column_name = 'artelo_sku') then
    alter table order_items rename column prodigi_sku to artelo_sku;
  end if;
end $$;

-- Rename the event_source enum value 'prodigi' → 'artelo' (Postgres 10+).
do $$ begin
  if exists (select 1 from pg_enum e
             join pg_type t on t.oid = e.enumtypid
             where t.typname = 'event_source' and e.enumlabel = 'prodigi')
     and not exists (select 1 from pg_enum e
             join pg_type t on t.oid = e.enumtypid
             where t.typname = 'event_source' and e.enumlabel = 'artelo') then
    alter type event_source rename value 'prodigi' to 'artelo';
  end if;
end $$;

-- ── Observability columns on orders ──────────────────────────────────────────
alter table orders add column if not exists artelo_submitted_at timestamptz;
-- Artelo's raw status (Received/InProduction/Shipped/…), kept distinct from our
-- provider-agnostic `status` enum so we can see exactly where Artelo is.
alter table orders add column if not exists artelo_status text;

-- ── Fulfilments (one row per Artelo submission attempt) ──────────────────────
create table if not exists fulfillments (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  provider              text not null default 'artelo',
  artelo_order_id       text,                  -- Artelo's UUID; null on a failed attempt
  status                text not null,         -- 'submitted' | 'failed'
  is_test               boolean not null,      -- mirrors ARTELO_TEST_ORDERS at submit time
  attempt_count         integer not null default 1,
  currency              text not null default 'usd',
  production_cost_cents integer,               -- Artelo COGS, from response details
  shipping_cost_cents   integer,
  tax_cents             integer,
  request_payload       jsonb,                 -- exactly what we POSTed
  response_payload      jsonb,                 -- Artelo's response (or error body)
  error                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists fulfillments_order_id_idx on fulfillments (order_id, created_at desc);

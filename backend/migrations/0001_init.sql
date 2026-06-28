-- 0001_init.sql — account system schema: orders, items, the tracking timeline,
-- saved addresses, profile prefs, and the display-only rewards scaffold.
--
-- App-owned tables live in `public`. The auth user id is a plain `text` column
-- (`user_id`) — we never FK into or migrate the `neon_auth` schema, which Neon
-- Auth owns. Statements are guarded (IF NOT EXISTS / DO blocks) so the file is
-- safe to re-run independently of the migration tracker.

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'pending_payment', 'paid', 'in_production',
      'shipped', 'delivered', 'cancelled', 'refunded'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'event_source') then
    create type event_source as enum ('stripe', 'artelo', 'system');
  end if;
end $$;

-- ── Orders ───────────────────────────────────────────────────────────────────
create table if not exists orders (
  id                          uuid primary key default gen_random_uuid(),
  order_number                text not null unique,        -- public: PP-XXXXXX
  user_id                     text,                         -- neon_auth user id; null for guest
  email                       text not null,                -- always captured (guest + /track)
  status                      order_status not null default 'pending_payment',
  currency                    text not null default 'usd',
  subtotal_cents              integer not null default 0,
  shipping_cents              integer not null default 0,
  total_cents                 integer not null default 0,
  stripe_payment_intent_id    text unique,
  stripe_checkout_session_id  text unique,
  artelo_order_id             text unique,
  ship_name    text, ship_line1 text, ship_line2 text, ship_city text,
  ship_region  text, ship_postal text, ship_country text,
  tracking_carrier text, tracking_number text, tracking_url text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists orders_user_id_idx      on orders (user_id, created_at desc);
create index if not exists orders_email_number_idx on orders (lower(email), order_number);
create index if not exists orders_status_idx        on orders (status);

-- ── Order items (immutable poster snapshot per line) ─────────────────────────
create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       text not null,
  product_label    text not null,
  quantity         integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null,
  poster_config    jsonb not null default '{}'::jsonb,
  artelo_sku       text,
  asset_url        text,
  created_at       timestamptz not null default now()
);
create index if not exists order_items_order_id_idx on order_items (order_id);

-- ── Order events (tracking timeline + audit of raw webhook payloads) ─────────
create table if not exists order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status,                 -- null for informational events
  message    text not null,
  source     event_source not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_id_idx on order_events (order_id, created_at);

-- ── Saved shipping addresses ─────────────────────────────────────────────────
create table if not exists addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  label      text,
  name       text not null,
  line1      text not null,
  line2      text,
  city       text not null,
  region     text,
  postal     text not null,
  country    text not null,                 -- ISO-3166 alpha-2
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists addresses_user_id_idx on addresses (user_id);

-- ── Profile prefs (display identity lives in neon_auth; these are app-owned) ─
create table if not exists user_profiles (
  user_id              text primary key,
  marketing_opt_in     boolean not null default false,
  order_updates_opt_in boolean not null default true,
  preferred_units      text not null default 'mi',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Rewards (display-only scaffold) ──────────────────────────────────────────
create table if not exists rewards (
  user_id        text primary key,
  points_balance integer not null default 0,
  credit_cents   integer not null default 0,
  referral_code  text not null unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists reward_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  kind         text not null,                -- 'signup_bonus' | 'referral' | 'order_credit' | 'promo'
  points       integer not null default 0,
  credit_cents integer not null default 0,
  description  text not null,
  created_at   timestamptz not null default now()
);
create index if not exists reward_events_user_id_idx on reward_events (user_id, created_at desc);

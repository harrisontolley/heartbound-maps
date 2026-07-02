-- 0004_leads.sql — the lead-magnet table: a free screen-res poster design,
-- emailed in exchange for an email address, ahead of the paid fine-art print.
--
-- One row per (email, design) pair — `config_hash` is a stable hash of the
-- design-identity subset of the poster config (see leadStore.hashPosterConfig),
-- so re-generating the *same* design just updates the row (new asset, same
-- download_token) instead of piling up duplicates. `user_id` is a plain `text`
-- column with NO foreign key, matching the rest of the app-owned schema — we
-- never FK into `neon_auth`. Safe to re-run (IF NOT EXISTS throughout).

create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  user_id            text,
  poster_config      jsonb not null default '{}'::jsonb,
  config_hash        text not null,
  asset_url          text,
  asset_pathname     text,
  download_token     text not null unique,
  source             text,
  utm                jsonb,
  consent            boolean not null default true,
  status             text not null default 'pending',
  resend_message_id  text,
  email_sent_at      timestamptz,
  downloaded_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists leads_email_hash_idx on leads (lower(email), config_hash);
create index if not exists leads_email_idx      on leads (lower(email), created_at desc);
create index if not exists leads_user_id_idx    on leads (user_id);

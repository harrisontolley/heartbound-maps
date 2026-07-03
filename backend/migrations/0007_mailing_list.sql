-- 0007_mailing_list.sql — mailing-list signups from the FAQ's "we don't have
-- my size?" prompt. Captures *why* (size / material / map-style / other) so
-- product decisions can be prioritized by real demand, not just guessed at
-- from analytics drop-off. One row per email — resubmitting merges reasons
-- instead of piling up duplicates, same spirit as 0004_leads.sql's dedupe.
-- Safe to re-run (IF NOT EXISTS throughout).

create table if not exists mailing_list_subscribers (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  reasons               jsonb not null default '[]'::jsonb, -- e.g. ["size","material"]
  other_text            text,                                -- only set when "other" is a reason
  source                text,                                -- e.g. "faq_size_question"
  consent               boolean not null default true,
  confirmation_sent_at  timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists mailing_list_subscribers_email_idx
  on mailing_list_subscribers (lower(email));
create index if not exists mailing_list_subscribers_created_idx
  on mailing_list_subscribers (created_at desc);

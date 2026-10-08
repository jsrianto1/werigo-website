-- ============================================================
-- Cookie consent record: proof of each choice made in the cookie
-- banner (accountability under UU PDP No. 27/2022). No identity is
-- stored: consent_id is a random UUID kept in the visitor's
-- werigo_consent cookie, and no IP address or user agent is kept.
-- Rows older than two years are purged by /api/consent.
-- ============================================================

create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null,
  version integer not null check (version between 1 and 1000),
  action text not null check (action in ('accept_all', 'reject_all', 'custom')),
  analytics boolean not null,
  marketing boolean not null,
  locale text check (locale in ('en', 'id', 'ru')),
  path text check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);

create index consent_log_consent_idx on public.consent_log (consent_id);
create index consent_log_created_idx on public.consent_log (created_at);

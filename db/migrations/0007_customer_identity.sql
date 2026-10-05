-- ============================================================
-- Customer identity for renting: identity document (passport or
-- Indonesian national ID / KTP) and driving licence number.
-- Numbers only; no document images are collected (see README,
-- LEGAL REVIEW checklist). Kept in its own table, away from the auth
-- tables, so it is never part of a session payload.
-- ============================================================

create table public.customer_identity (
  user_id text primary key references "user" ("id") on delete cascade,
  id_type text not null check (id_type in ('passport', 'national_id')),
  id_number text not null check (char_length(id_number) between 5 and 30),
  driving_license_number text not null check (char_length(driving_license_number) between 4 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One account per identity document (also stops the welcome offer
-- being claimed twice with the same passport / KTP).
create unique index customer_identity_document_uniq
  on public.customer_identity (id_type, upper(id_number));

create trigger customer_identity_set_updated_at
  before update on public.customer_identity
  for each row execute function public.set_updated_at();

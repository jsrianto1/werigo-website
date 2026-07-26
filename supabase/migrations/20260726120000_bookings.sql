-- ============================================================
-- Werigo bookings schema — initial migration
-- Run with: supabase db push   (or paste into the Supabase SQL
-- editor once, in order, per README "Supabase setup").
-- ============================================================

-- ---------- Enums ----------
create type booking_status as enum (
  'new', 'contacted', 'quoted', 'confirmed',
  'active', 'completed', 'cancelled', 'no_response'
);

-- The four customer-facing rental models (consolidated — no variants)
create type vehicle_model as enum ('bees', 'victory', 'athena', 'edpower');

create type delivery_method as enum ('delivery', 'pickup');

-- ---------- bookings ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  client_submission_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- customer
  full_name text not null check (char_length(full_name) between 1 and 200),
  whatsapp_number text not null check (whatsapp_number ~ '^\+[0-9]{8,15}$'),
  email text not null check (position('@' in email) > 1),
  nationality text,

  -- rental
  pickup_area text not null,
  pickup_address text,
  return_area text not null,
  return_address text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  vehicle_model vehicle_model not null,
  quantity integer not null default 1 check (quantity between 1 and 10),
  delivery_method delivery_method not null default 'delivery',
  customer_notes text,

  -- lifecycle
  status booking_status not null default 'new',

  -- attribution
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- consent & ops
  privacy_consent_at timestamptz not null,
  assigned_to text,
  internal_notes text,
  follow_up_at timestamptz,

  constraint bookings_period_valid check (end_at > start_at)
);

comment on table public.bookings is
  'Source of truth for Werigo booking requests. Public inserts only via the server API (service role); RLS denies anon/authenticated.';

create index bookings_created_at_idx on public.bookings (created_at desc);
create index bookings_status_idx on public.bookings (status);
create index bookings_vehicle_model_idx on public.bookings (vehicle_model);
create index bookings_pickup_area_idx on public.bookings (pickup_area);
create index bookings_start_at_idx on public.bookings (start_at);
create index bookings_follow_up_at_idx on public.bookings (follow_up_at)
  where follow_up_at is not null;

-- ---------- booking_events (audit timeline) ----------
create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  event_type text not null,
  previous_status booking_status,
  new_status booking_status,
  note text,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

create index booking_events_booking_id_idx
  on public.booking_events (booking_id, created_at desc);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------- Booking code generator ----------
-- Readable unique code: WRG-YYYYMMDD-XXXX (unambiguous alphabet).
create or replace function public.generate_booking_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  suffix text;
  candidate text;
  tries integer := 0;
begin
  loop
    suffix := '';
    for i in 1..4 loop
      suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := 'WRG-' || to_char(now() at time zone 'Asia/Makassar', 'YYYYMMDD') || '-' || suffix;
    exit when not exists (select 1 from public.bookings where booking_code = candidate);
    tries := tries + 1;
    if tries > 50 then
      raise exception 'could not generate unique booking code';
    end if;
  end loop;
  return candidate;
end;
$$;

alter table public.bookings
  alter column booking_code set default public.generate_booking_code();

-- ---------- Status-change audit trigger ----------
create or replace function public.log_booking_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into public.booking_events
      (booking_id, event_type, previous_status, new_status, actor)
    values
      (new.id, 'status_change', old.status, new.status,
       coalesce(current_setting('werigo.actor', true), 'system'));
  end if;
  return new;
end;
$$;

create trigger bookings_log_status_change
  after update on public.bookings
  for each row execute function public.log_booking_status_change();

-- ---------- Status summary helper ----------
create or replace function public.booking_status_counts()
returns table (status booking_status, n bigint)
language sql
stable
as $$
  select status, count(*)::bigint from public.bookings group by status;
$$;

-- ---------- Row Level Security ----------
-- RLS enabled with NO policies: anon and authenticated roles can
-- neither read nor write. All access goes through the server using
-- the service role (which bypasses RLS) after the ADMIN_EMAILS
-- allowlist check. Public booking creation happens only via
-- POST /api/bookings on the server.
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;

revoke all on public.bookings from anon, authenticated;
revoke all on public.booking_events from anon, authenticated;

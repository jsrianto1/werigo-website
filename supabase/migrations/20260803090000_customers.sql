-- ============================================================
-- Werigo customer database — every person who fills in a form
--
-- Adds two tables on top of the existing bookings schema:
--   customers         one row per person, deduplicated on WhatsApp
--                     number first and email second
--   form_submissions  one immutable row per form fill (booking
--                     request or contact message), always linked to
--                     a customer, with the full raw payload kept in
--                     `details` so nothing the visitor typed is lost
--
-- Run after 20260726120000_bookings.sql.
-- ============================================================

-- ---------- Enums ----------
create type customer_status as enum (
  'lead', 'contacted', 'customer', 'archived', 'blocked'
);

create type form_type as enum ('booking_request', 'contact_message');

create type submission_status as enum (
  'new', 'contacted', 'handled', 'spam', 'archived'
);

-- ---------- customers ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- identity
  full_name text not null check (char_length(full_name) between 1 and 200),
  first_name text,
  last_name text,
  email text check (email is null or position('@' in email) > 1),
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^\+[0-9]{8,15}$'),
  nationality text,

  -- activity (maintained by upsert_customer)
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  submissions_count integer not null default 0,
  booking_requests_count integer not null default 0,
  contact_messages_count integer not null default 0,

  -- attribution: first touch is kept, last touch is refreshed
  first_source_page text,
  last_source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- consent
  privacy_consent_at timestamptz,
  marketing_consent boolean not null default false,

  -- ops
  status customer_status not null default 'lead',
  assigned_to text,
  internal_notes text,
  tags text[] not null default '{}',

  -- a customer we cannot reach is not a customer record worth keeping
  constraint customers_contactable
    check (email is not null or whatsapp_number is not null)
);

comment on table public.customers is
  'One row per person who submitted any Werigo form. Written only by the server (service role); RLS denies anon/authenticated.';

-- Deduplication keys. Partial so that a missing email or missing
-- number never collides with another incomplete record.
create unique index customers_whatsapp_key
  on public.customers (whatsapp_number)
  where whatsapp_number is not null;

create unique index customers_email_key
  on public.customers (lower(email))
  where email is not null;

create index customers_created_at_idx on public.customers (created_at desc);
create index customers_last_seen_at_idx on public.customers (last_seen_at desc);
create index customers_status_idx on public.customers (status);
create index customers_full_name_idx on public.customers (lower(full_name));

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------- form_submissions ----------
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  client_submission_id uuid not null unique,
  customer_id uuid not null references public.customers (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  form_type form_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- what the visitor typed, exactly as submitted
  full_name text not null,
  email text,
  whatsapp_number text,
  nationality text,
  message text,

  -- booking-request fields (null on contact messages)
  vehicle_model text,
  quantity integer check (quantity is null or quantity between 1 and 10),
  pickup_area text,
  pickup_address text,
  return_area text,
  return_address text,
  hotel_name text,
  flight_number text,
  start_at timestamptz,
  end_at timestamptz,
  rental_days integer,
  rate_per_day_idr bigint,
  estimated_total_idr bigint,
  promo_code text,
  extras jsonb not null default '[]'::jsonb,

  -- consent captured on the form
  privacy_consent_at timestamptz not null,
  terms_accepted boolean not null default false,
  battery_ack boolean not null default false,
  age_confirmed boolean,

  -- attribution and delivery
  handoff_channel text not null default 'whatsapp',
  source_page text,
  referrer text,
  locale text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- everything else the form held, verbatim, so no field is ever lost
  details jsonb not null default '{}'::jsonb,

  -- ops
  status submission_status not null default 'new',
  internal_notes text,

  constraint form_submissions_period_valid
    check (start_at is null or end_at is null or end_at > start_at)
);

comment on table public.form_submissions is
  'Immutable record of every form fill on werigo.co. `details` keeps the full submitted payload.';

create index form_submissions_customer_idx
  on public.form_submissions (customer_id, created_at desc);
create index form_submissions_created_at_idx
  on public.form_submissions (created_at desc);
create index form_submissions_form_type_idx on public.form_submissions (form_type);
create index form_submissions_status_idx on public.form_submissions (status);
create index form_submissions_source_page_idx on public.form_submissions (source_page);

create trigger form_submissions_set_updated_at
  before update on public.form_submissions
  for each row execute function public.set_updated_at();

-- ---------- Link bookings to the customer record ----------
alter table public.bookings
  add column customer_id uuid references public.customers (id) on delete set null;

create index bookings_customer_id_idx on public.bookings (customer_id)
  where customer_id is not null;

-- ---------- Reference code generator ----------
-- Readable unique code: WRG-L-YYYYMMDD-XXXX (L for lead), same
-- unambiguous alphabet as the booking code.
create or replace function public.generate_submission_ref()
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
    candidate := 'WRG-L-' || to_char(now() at time zone 'Asia/Makassar', 'YYYYMMDD') || '-' || suffix;
    exit when not exists (select 1 from public.form_submissions where reference_code = candidate);
    tries := tries + 1;
    if tries > 50 then
      raise exception 'could not generate unique submission reference';
    end if;
  end loop;
  return candidate;
end;
$$;

alter table public.form_submissions
  alter column reference_code set default public.generate_submission_ref();

-- ---------- Customer upsert ----------
-- Matches an existing person by WhatsApp number first, then by email.
-- Identity fields are only filled in when they are still empty, so a
-- second submission never overwrites a good value with a blank one and
-- never trips the deduplication indexes.
create or replace function public.upsert_customer(
  p_full_name text,
  p_email text,
  p_whatsapp text,
  p_nationality text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_form_type form_type default 'booking_request',
  p_source_page text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_privacy_consent_at timestamptz default null,
  p_marketing_consent boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_whatsapp text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_id uuid;
begin
  if v_email is null and v_whatsapp is null then
    raise exception 'upsert_customer needs an email or a WhatsApp number';
  end if;

  if v_whatsapp is not null then
    select id into v_id from public.customers
      where whatsapp_number = v_whatsapp limit 1;
  end if;

  if v_id is null and v_email is not null then
    select id into v_id from public.customers
      where lower(email) = v_email limit 1;
  end if;

  if v_id is null then
    insert into public.customers (
      full_name, first_name, last_name, email, whatsapp_number, nationality,
      first_source_page, last_source_page, utm_source, utm_medium, utm_campaign,
      privacy_consent_at, marketing_consent,
      submissions_count, booking_requests_count, contact_messages_count
    ) values (
      coalesce(v_name, 'Unknown'),
      nullif(trim(coalesce(p_first_name, '')), ''),
      nullif(trim(coalesce(p_last_name, '')), ''),
      v_email, v_whatsapp,
      nullif(trim(coalesce(p_nationality, '')), ''),
      p_source_page, p_source_page, p_utm_source, p_utm_medium, p_utm_campaign,
      p_privacy_consent_at, coalesce(p_marketing_consent, false),
      1,
      case when p_form_type = 'booking_request' then 1 else 0 end,
      case when p_form_type = 'contact_message' then 1 else 0 end
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.customers set
    full_name = coalesce(v_name, full_name),
    first_name = coalesce(first_name, nullif(trim(coalesce(p_first_name, '')), '')),
    last_name = coalesce(last_name, nullif(trim(coalesce(p_last_name, '')), '')),
    -- only fill a blank identity field, and only when the value is free
    email = case
      when email is not null then email
      when v_email is null then email
      when exists (select 1 from public.customers c2
                   where lower(c2.email) = v_email and c2.id <> customers.id) then email
      else v_email
    end,
    whatsapp_number = case
      when whatsapp_number is not null then whatsapp_number
      when v_whatsapp is null then whatsapp_number
      when exists (select 1 from public.customers c2
                   where c2.whatsapp_number = v_whatsapp and c2.id <> customers.id) then whatsapp_number
      else v_whatsapp
    end,
    nationality = coalesce(nationality, nullif(trim(coalesce(p_nationality, '')), '')),
    last_seen_at = now(),
    last_source_page = coalesce(p_source_page, last_source_page),
    utm_source = coalesce(utm_source, p_utm_source),
    utm_medium = coalesce(utm_medium, p_utm_medium),
    utm_campaign = coalesce(utm_campaign, p_utm_campaign),
    privacy_consent_at = greatest(
      coalesce(privacy_consent_at, p_privacy_consent_at),
      coalesce(p_privacy_consent_at, privacy_consent_at)
    ),
    marketing_consent = marketing_consent or coalesce(p_marketing_consent, false),
    submissions_count = submissions_count + 1,
    booking_requests_count = booking_requests_count
      + case when p_form_type = 'booking_request' then 1 else 0 end,
    contact_messages_count = contact_messages_count
      + case when p_form_type = 'contact_message' then 1 else 0 end
  where id = v_id;

  return v_id;
end;
$$;

-- ---------- Atomic capture ----------
-- One round trip, one transaction: replay check, customer upsert and
-- submission insert. Doing it in a single function is what keeps the
-- per-customer counters correct when a visitor double-clicks or the
-- browser retries, because a rejected replay never reaches the upsert.
create or replace function public.capture_submission(p jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_existing public.form_submissions;
  v_customer uuid;
  v_row public.form_submissions;
begin
  select * into v_existing from public.form_submissions
    where client_submission_id = (p->>'client_submission_id')::uuid;
  if found then
    return jsonb_build_object(
      'duplicate', true,
      'customer_id', v_existing.customer_id,
      'submission', to_jsonb(v_existing)
    );
  end if;

  v_customer := public.upsert_customer(
    p->>'full_name',
    p->>'email',
    p->>'whatsapp_number',
    p->>'nationality',
    p->>'first_name',
    p->>'last_name',
    (p->>'form_type')::form_type,
    p->>'source_page',
    p->>'utm_source',
    p->>'utm_medium',
    p->>'utm_campaign',
    (p->>'privacy_consent_at')::timestamptz,
    coalesce((p->>'marketing_consent')::boolean, false)
  );

  insert into public.form_submissions (
    client_submission_id, customer_id, form_type,
    full_name, email, whatsapp_number, nationality, message,
    vehicle_model, quantity, pickup_area, pickup_address,
    return_area, return_address, hotel_name, flight_number,
    start_at, end_at, rental_days, rate_per_day_idr,
    estimated_total_idr, promo_code, extras,
    privacy_consent_at, terms_accepted, battery_ack, age_confirmed,
    handoff_channel, source_page, referrer, locale,
    utm_source, utm_medium, utm_campaign, details
  ) values (
    (p->>'client_submission_id')::uuid, v_customer, (p->>'form_type')::form_type,
    p->>'full_name', p->>'email', p->>'whatsapp_number', p->>'nationality', p->>'message',
    p->>'vehicle_model', (p->>'quantity')::integer, p->>'pickup_area', p->>'pickup_address',
    p->>'return_area', p->>'return_address', p->>'hotel_name', p->>'flight_number',
    (p->>'start_at')::timestamptz, (p->>'end_at')::timestamptz,
    (p->>'rental_days')::integer, (p->>'rate_per_day_idr')::bigint,
    (p->>'estimated_total_idr')::bigint, p->>'promo_code',
    coalesce(p->'extras', '[]'::jsonb),
    coalesce((p->>'privacy_consent_at')::timestamptz, now()),
    coalesce((p->>'terms_accepted')::boolean, false),
    coalesce((p->>'battery_ack')::boolean, false),
    (p->>'age_confirmed')::boolean,
    coalesce(p->>'handoff_channel', 'whatsapp'),
    p->>'source_page', p->>'referrer', p->>'locale',
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign',
    coalesce(p->'details', '{}'::jsonb)
  )
  returning * into v_row;

  return jsonb_build_object(
    'duplicate', false,
    'customer_id', v_customer,
    'submission', to_jsonb(v_row)
  );
end;
$$;

-- ---------- Dashboard summary helpers ----------
create or replace function public.customer_status_counts()
returns table (status customer_status, n bigint)
language sql
stable
as $$
  select status, count(*)::bigint from public.customers group by status;
$$;

create or replace function public.submission_type_counts()
returns table (form_type form_type, n bigint)
language sql
stable
as $$
  select form_type, count(*)::bigint from public.form_submissions group by form_type;
$$;

-- ---------- Row Level Security ----------
-- Same posture as bookings: RLS on, no policies at all. Neither anon
-- nor authenticated can read or write. Every access path goes through
-- the server with the service role, behind the ADMIN_EMAILS allowlist.
alter table public.customers enable row level security;
alter table public.form_submissions enable row level security;

revoke all on public.customers from anon, authenticated;
revoke all on public.form_submissions from anon, authenticated;
-- The write path is server-only too. Postgres grants EXECUTE on new
-- functions to PUBLIC by default, so revoke that as well and hand the
-- privilege back to the service role alone.
revoke all on function public.upsert_customer(
  text, text, text, text, text, text, form_type, text, text, text, text,
  timestamptz, boolean
) from public, anon, authenticated;
revoke all on function public.capture_submission(jsonb)
  from public, anon, authenticated;

grant execute on function public.upsert_customer(
  text, text, text, text, text, text, form_type, text, text, text, text,
  timestamptz, boolean
) to service_role;
grant execute on function public.capture_submission(jsonb) to service_role;

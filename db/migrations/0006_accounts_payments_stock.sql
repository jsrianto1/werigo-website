-- ============================================================
-- Phase 1: customer accounts, online payment (Midtrans Snap),
-- per-model stock, and the admin audit log.
-- ============================================================

-- ---------- customer profile fields (Better Auth additionalFields) ----------
alter table "user"
  add column if not exists "phone" text,
  add column if not exists "nationality" text;

-- ---------- bookings: owner, price snapshot, payment state ----------
alter table public.bookings
  add column user_id text references "user" ("id") on delete set null,
  -- price snapshot computed on the server at booking time (IDR, whole rupiah)
  add column rental_days integer,
  add column rate_per_day_idr integer,
  add column base_idr integer,
  add column area_fee_idr integer not null default 0,
  add column discount_idr integer not null default 0,
  add column discount_code text,
  add column total_idr integer,
  add column payment_status payment_status not null default 'unpaid',
  add column payment_expires_at timestamptz,
  add column paid_at timestamptz;

create index bookings_user_id_idx on public.bookings (user_id, created_at desc);
create index bookings_payment_status_idx on public.bookings (payment_status);
-- availability queries: bookings of a model overlapping a period
create index bookings_model_period_idx on public.bookings (vehicle_model, start_at, end_at);

comment on column public.bookings.total_idr is
  'Amount charged online (base + area fee - discount). Null for bookings that never entered the payment flow.';

-- ---------- payments: one row per Snap transaction ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  provider text not null default 'midtrans',
  -- Midtrans order_id: booking code, suffixed on retries (WRG-…-2)
  order_id text not null unique,
  snap_token text,
  redirect_url text,
  gross_amount integer not null check (gross_amount > 0),
  transaction_id text,
  transaction_status text,          -- pending, settlement, capture, expire, deny, cancel, refund, …
  fraud_status text,
  payment_type text,
  status_code text,
  transaction_time timestamptz,
  settlement_time timestamptz,
  expires_at timestamptz,
  last_notification jsonb,          -- last verified notification payload (no card data is ever sent)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_booking_id_idx on public.payments (booking_id, created_at desc);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------- vehicle stock: units per model ----------
-- total_units NULL means "not tracked" (no limit enforced), so the
-- site keeps taking bookings until the team enters real numbers.
create table public.vehicle_stock (
  model vehicle_model primary key,
  total_units integer check (total_units is null or total_units >= 0),
  updated_at timestamptz not null default now()
);

insert into public.vehicle_stock (model, total_units)
values ('bees', null), ('victory', null), ('athena', null), ('edpower', null);

create trigger vehicle_stock_set_updated_at
  before update on public.vehicle_stock
  for each row execute function public.set_updated_at();

-- ---------- audit log: who did what in the admin ----------
create table public.audit_log (
  id bigserial primary key,
  actor_id text,
  actor_email text,
  actor_role text,
  action text not null,             -- e.g. booking.update, stock.update, admin.login
  entity_type text,
  entity_id text,
  meta jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

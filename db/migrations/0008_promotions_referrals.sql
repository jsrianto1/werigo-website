-- ============================================================
-- Phase 2: promotions (promo codes, automatic campaigns, assigned
-- vouchers), referral program, and admin-editable settings.
-- One discount per booking; the server picks the best available one
-- unless the customer chooses another.
-- ============================================================

-- ---------- settings (admin-editable values) ----------
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.settings (key, value) values
  ('referral', '{"refereeDiscountPercent": 10, "referrerFeePercent": 10, "minPayoutIdr": 500000, "firstBookingOnly": true}');

-- ---------- promotions ----------
-- audience:
--   public    anyone who types the code at checkout
--   auto      offered automatically to every eligible customer (no code needed)
--   assigned  only customers the voucher was given to (voucher_grants)
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9_-]{3,30}$'),
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  audience text not null check (audience in ('public', 'auto', 'assigned')),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_discount_idr integer check (max_discount_idr is null or max_discount_idr > 0),
  min_rental_idr integer check (min_rental_idr is null or min_rental_idr >= 0),
  first_booking_only boolean not null default false,
  models vehicle_model[],
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit_total integer check (usage_limit_total is null or usage_limit_total > 0),
  usage_limit_per_user integer check (usage_limit_per_user is null or usage_limit_per_user > 0),
  featured boolean not null default false,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_percent_range check (discount_type <> 'percent' or discount_value <= 100),
  constraint promotions_period_valid check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create unique index promotions_code_uniq on public.promotions (upper(code));

create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

create table public.voucher_grants (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  granted_by text,
  granted_at timestamptz not null default now(),
  unique (promotion_id, user_id)
);

create index voucher_grants_user_idx on public.voucher_grants (user_id);

-- ---------- bookings: which discount was used ----------
alter table public.bookings
  add column promotion_id uuid references public.promotions (id) on delete set null,
  add column discount_kind text check (discount_kind is null or discount_kind in ('promotion', 'referral')),
  add column referral_owner_id text references "user" ("id") on delete set null,
  add column referral_fee_percent integer check (referral_fee_percent is null or referral_fee_percent between 0 and 100);

create index bookings_promotion_idx on public.bookings (promotion_id) where promotion_id is not null;
create index bookings_referral_owner_idx on public.bookings (referral_owner_id) where referral_owner_id is not null;

-- ---------- referral program ----------
create table public.referral_codes (
  user_id text primary key references "user" ("id") on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{4,20}$'),
  created_at timestamptz not null default now()
);

create unique index referral_codes_code_uniq on public.referral_codes (upper(code));

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete restrict,
  amount_idr integer not null check (amount_idr > 0),
  bank_name text not null check (char_length(bank_name) between 2 and 60),
  account_number text not null check (account_number ~ '^[0-9]{5,30}$'),
  account_name text not null check (char_length(account_name) between 2 and 100),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text
);

create index payout_requests_status_idx on public.payout_requests (status, requested_at desc);
create index payout_requests_user_idx on public.payout_requests (user_id, requested_at desc);

-- One row per referred booking. pending → available when the rental is
-- completed; void when it is cancelled or refunded; paid_out once a
-- payout that includes it is paid.
create table public.referral_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references "user" ("id") on delete restrict,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  amount_idr integer not null check (amount_idr >= 0),
  status text not null default 'pending' check (status in ('pending', 'available', 'void', 'paid_out')),
  payout_id uuid references public.payout_requests (id) on delete set null,
  created_at timestamptz not null default now(),
  available_at timestamptz,
  updated_at timestamptz not null default now()
);

create index referral_ledger_owner_idx on public.referral_ledger (owner_id, created_at desc);

create trigger referral_ledger_set_updated_at
  before update on public.referral_ledger
  for each row execute function public.set_updated_at();

-- ---------- welcome offer moves from code into the database ----------
insert into public.promotions
  (code, title, description, audience, discount_type, discount_value,
   first_booking_only, ends_at, usage_limit_per_user, featured)
values
  ('WELCOME20', 'Welcome offer', '20% off your first electric scooter rental',
   'auto', 'percent', 20, true, '2026-10-31T23:59:59+08:00', 1, true);

update public.bookings
   set promotion_id = (select id from public.promotions where code = 'WELCOME20'),
       discount_kind = 'promotion'
 where discount_code = 'WELCOME20';

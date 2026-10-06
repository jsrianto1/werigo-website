-- ============================================================
-- Phase 3: customer management, staff management, notification
-- settings. Suspend / block reuse Better Auth's banned / banReason /
-- banExpires columns on "user", so the auth layer itself refuses the
-- session.
-- ============================================================

-- Staff created with a temporary password must set their own one.
alter table "user"
  add column if not exists "mustChangePassword" boolean not null default false,
  add column if not exists "lastLoginAt" timestamptz;

-- Internal notes about a customer, visible to staff only.
create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  author_email text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index customer_notes_user_idx on public.customer_notes (user_id, created_at desc);

-- Which WhatsApp notifications go out and to whom. The Fonnte token
-- itself stays in the server environment.
insert into public.settings (key, value) values
  ('notifications', '{"adminNumbers": [], "bookingNewAdmin": true, "bookingPaidAdmin": true, "bookingPaidCustomer": true, "payoutRequestedAdmin": true, "payoutPaidCustomer": true}')
on conflict (key) do nothing;

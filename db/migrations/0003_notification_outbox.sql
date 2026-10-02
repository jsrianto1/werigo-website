-- ============================================================
-- Notification outbox: every WhatsApp (Fonnte) message is recorded
-- here first and delivered by the app, with retries from the VPS cron
-- (GET /api/cron/notifications). A failed delivery never loses the
-- notification and never affects the booking itself.
-- ============================================================

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  kind text not null,                         -- e.g. booking_new_admin
  target text not null,                       -- digits, international (628…)
  message text not null,
  booking_id uuid references public.bookings (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notification_outbox_due_idx
  on public.notification_outbox (next_attempt_at)
  where status = 'pending';

create index notification_outbox_booking_idx
  on public.notification_outbox (booking_id);

create trigger notification_outbox_set_updated_at
  before update on public.notification_outbox
  for each row execute function public.set_updated_at();

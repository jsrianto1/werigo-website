-- Durable latest-state outbox. No credentials or identity documents.
create table public.werigo_ops_sync_settings (
 id integer primary key check(id=1),
 enabled boolean not null default false,
 ready boolean not null default false,
 last_ops_event bigint not null default 0,
 updated_at timestamptz not null default now()
);
insert into public.werigo_ops_sync_settings(id) values(1);
create sequence public.werigo_ops_sync_revision;
create table public.werigo_ops_sync_queue (
 booking_id uuid primary key references public.bookings(id),
 revision bigint not null default nextval('public.werigo_ops_sync_revision'),
 synced_revision bigint not null default 0,
 attempts integer not null default 0,
 last_error text,
 next_attempt_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create or replace function public.enqueue_werigo_ops_sync() returns trigger language plpgsql as $$
begin
 insert into public.werigo_ops_sync_queue(booking_id) values(new.id)
 on conflict(booking_id) do update set revision=nextval('public.werigo_ops_sync_revision'),
 attempts=0,last_error=null,next_attempt_at=now(),updated_at=now();
 return new;
end;
$$;
create trigger bookings_ops_sync_insert after insert on public.bookings
 for each row execute function public.enqueue_werigo_ops_sync();
create trigger bookings_ops_sync_update after update of status,payment_status,payment_expires_at,start_at,end_at,quantity,vehicle_model on public.bookings
 for each row when(old.* is distinct from new.*) execute function public.enqueue_werigo_ops_sync();
-- Existing future commitments must be reconciled before enabling the bridge.
insert into public.werigo_ops_sync_queue(booking_id)
 select id from public.bookings where end_at>now()
 and status not in ('cancelled','completed','expired','no_response')
 and (payment_status='paid' or (payment_status='pending' and payment_expires_at>now()) or status in ('confirmed','active'));

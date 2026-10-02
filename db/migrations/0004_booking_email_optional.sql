-- The checkout form treats email as optional (WhatsApp is the primary
-- contact). Allow NULL; keep the shape check for non-null values.
alter table public.bookings alter column email drop not null;
alter table public.bookings drop constraint if exists bookings_email_check;
alter table public.bookings
  add constraint bookings_email_check check (email is null or position('@' in email) > 1);

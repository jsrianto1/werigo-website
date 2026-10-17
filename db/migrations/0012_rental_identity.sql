-- Identity is collected at rental checkout, not account registration.
-- Existing documents remain intact. A licence number can be omitted;
-- this does not remove the rider's legal responsibility to hold a valid licence.
alter table public.customer_identity drop constraint customer_identity_id_type_check;
alter table public.customer_identity add constraint customer_identity_id_type_check
  check (id_type in ('passport', 'national_id', 'kitas'));
alter table public.customer_identity drop constraint customer_identity_driving_license_number_check;
alter table public.customer_identity add constraint customer_identity_driving_license_number_check
  check (driving_license_number = '' or char_length(driving_license_number) between 4 and 30);

alter table public.werigo_ops_sync_settings
 add column ops_public_key text,
 add column cron_verified_at timestamptz,
 add column last_sync_at timestamptz,
 add column last_sync_error text;
create table public.werigo_ops_sync_audit (
 id bigint generated always as identity primary key,
 action text not null,
 actor text not null default 'hosting-maintenance',
 detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);

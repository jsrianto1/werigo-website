-- Editorial CMS only; existing rental and account tables are unchanged.
create table public.werigo_cms_documents (
  key text primary key check (key in ('home','places')),
  draft jsonb not null,
  published jsonb,
  version integer not null default 1 check (version > 0),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create table public.werigo_cms_revisions (
  id uuid primary key default gen_random_uuid(),
  document_key text not null references public.werigo_cms_documents(key),
  version integer not null,
  event text not null check (event in ('draft','publish','restore','unpublish')),
  payload jsonb not null,
  actor text not null,
  created_at timestamptz not null default now(),
  unique(document_key,version)
);
create index werigo_cms_revisions_document on public.werigo_cms_revisions(document_key,version desc);
create table public.werigo_cms_media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body bytea not null,
  mime text not null check (mime = 'image/webp'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sha256 text not null,
  public boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  check (octet_length(body) <= 5242880)
);

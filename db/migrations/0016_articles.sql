-- Separate article drafts and published snapshots; existing CMS and rental data are unchanged.
create table public.werigo_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  draft jsonb not null,
  published jsonb,
  version integer not null default 1 check (version > 0),
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  visible_from timestamptz,
  first_published_at timestamptz
);
create index werigo_articles_published on public.werigo_articles(published_at desc) where published is not null;
create table public.werigo_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.werigo_articles(id),
  version integer not null,
  event text not null check (event in ('draft','publish','unpublish','restore')),
  payload jsonb not null,
  actor text not null,
  created_at timestamptz not null default now(),
  unique(article_id,version)
);

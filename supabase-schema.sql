-- Experiments Calendar — database schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".

create extension if not exists "pgcrypto";

create table if not exists public.experiments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'planned'
              check (status in ('planned', 'running', 'done', 'blocked')),
  owner       text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- Keep ranges sane: end must not precede start.
alter table public.experiments
  drop constraint if exists experiments_end_after_start;
alter table public.experiments
  add constraint experiments_end_after_start check (end_date >= start_date);

-- Row Level Security.
-- This app is "anyone with the link can view + edit" (no login), so we allow
-- the anonymous (anon) role full access. Anyone with your anon key + URL can
-- read and write. That's the intended trade-off for a frictionless shared tool.
-- If you later add logins, tighten these policies.
alter table public.experiments enable row level security;

drop policy if exists "anon full access" on public.experiments;
create policy "anon full access"
  on public.experiments
  for all
  to anon
  using (true)
  with check (true);

-- Enable realtime so collaborators see changes live.
alter publication supabase_realtime add table public.experiments;

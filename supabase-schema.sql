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

-- ---------------------------------------------------------------------------
-- Tray-sequencing planner
-- ---------------------------------------------------------------------------

-- Trays: the vertical cards inside an experiment. `position` is the sequence
-- within one experiment (0 = top).
create table if not exists public.trays (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  uuid not null references public.experiments(id) on delete cascade,
  name           text not null,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists trays_experiment_position_idx
  on public.trays (experiment_id, position);

-- Day-wise "images of that day" links (one row per calendar day).
create table if not exists public.day_links (
  day         date primary key,
  images_url  text not null default '',
  updated_at  timestamptz not null default now()
);

-- Universal app settings as key/value (e.g. publishing_url, tray_qc_url).
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

-- Same "anyone with the link can view + edit" model as experiments.
alter table public.trays enable row level security;
drop policy if exists "anon full access" on public.trays;
create policy "anon full access" on public.trays
  for all to anon using (true) with check (true);

alter table public.day_links enable row level security;
drop policy if exists "anon full access" on public.day_links;
create policy "anon full access" on public.day_links
  for all to anon using (true) with check (true);

alter table public.app_settings enable row level security;
drop policy if exists "anon full access" on public.app_settings;
create policy "anon full access" on public.app_settings
  for all to anon using (true) with check (true);

-- Realtime for live collaboration.
alter publication supabase_realtime add table public.trays;
alter publication supabase_realtime add table public.day_links;
alter publication supabase_realtime add table public.app_settings;

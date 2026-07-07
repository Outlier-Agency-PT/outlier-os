-- ============================================================
-- DAILY STANDUPS — dashboard do colaborador
-- ============================================================

create table daily_standups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references team_members(id) on delete cascade,
  date date not null default current_date,
  yesterday text,
  today text,
  blockers text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index idx_daily_standups_user_date on daily_standups(user_id, date);

alter table daily_standups enable row level security;

create policy "daily_standups_own" on daily_standups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

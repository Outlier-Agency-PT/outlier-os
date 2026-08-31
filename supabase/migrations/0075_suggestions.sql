-- ============================================================
-- SUGGESTIONS — Sistema de sugestões de equipa
-- ============================================================

create table suggestions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  author_id uuid not null references team_members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejected_reason text,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_suggestions_author on suggestions(author_id);
create index idx_suggestions_status on suggestions(status);

alter table suggestions enable row level security;

create policy "suggestions_admin_select" on suggestions
  for select using (
    exists (
      select 1 from team_members
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "suggestions_member_select" on suggestions
  for select using (author_id = auth.uid());

create policy "suggestions_insert" on suggestions
  for insert with check (
    author_id = auth.uid() and
    exists (
      select 1 from team_members
      where id = auth.uid() and active = true
    )
  );

create policy "suggestions_admin_update" on suggestions
  for update using (
    exists (
      select 1 from team_members
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- ROADMAP Space and List (fixed UUIDs)
-- ============================================================

insert into task_spaces (id, name, color, position)
values ('00000000-0000-0000-0000-000000000020'::uuid, 'Roadmap', '#10b981', 10)
on conflict (id) do nothing;

insert into task_lists (id, space_id, name, color, position)
values ('00000000-0000-0000-0000-000000000021'::uuid, '00000000-0000-0000-0000-000000000020'::uuid, 'Roadmap', '#10b981', 0)
on conflict (id) do nothing;

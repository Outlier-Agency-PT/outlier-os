-- ============================================================
-- Outlier OS — Task ClickUp Hierarchy Layer
-- 29 Jun 2026
-- Adiciona estrutura de Spaces e Lists para organização de tarefas
-- ============================================================

-- ============================================================
-- TASK_SPACES — Espaços de trabalho (Spaces)
-- ============================================================

create table if not exists task_spaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color text default '#6366f1',
  owner_id uuid references auth.users(id) on delete set null,
  position int default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_spaces_position on task_spaces(position);

-- ============================================================
-- TASK_LISTS — Listas dentro de espaços
-- ============================================================

create table if not exists task_lists (
  id uuid primary key default uuid_generate_v4(),
  space_id uuid not null references task_spaces(id) on delete cascade,
  name text not null,
  color text default '#8b5cf6',
  position int default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_lists_space on task_lists(space_id);

-- ============================================================
-- ALTER TASKS — Adicionar colunas de hierarquia
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'list_id'
  ) then
    alter table tasks add column list_id uuid references task_lists(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'parent_task_id'
  ) then
    alter table tasks add column parent_task_id uuid references tasks(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'assignees'
  ) then
    alter table tasks add column assignees uuid[] default '{}';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'position'
  ) then
    alter table tasks add column position int default 0;
  end if;
end $$;

-- ============================================================
-- INDEXES — Novas colunas de tarefas
-- ============================================================

create index if not exists idx_tasks_list on tasks(list_id);
create index if not exists idx_tasks_parent on tasks(parent_task_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table task_spaces enable row level security;
alter table task_lists enable row level security;

-- Espaços de tarefas — acesso via módulo 'tarefas'
create policy if not exists "task_spaces_module" on task_spaces
  for all using (has_module(auth.uid(), 'tarefas'));

-- Listas de tarefas — acesso via módulo 'tarefas'
create policy if not exists "task_lists_module" on task_lists
  for all using (has_module(auth.uid(), 'tarefas'));

-- ============================================================
-- SEED DATA — Espaço e Lista padrão
-- ============================================================

-- Espaço 'Geral' com UUID fixo
insert into task_spaces (id, name, color, position)
values ('00000000-0000-0000-0000-000000000010'::uuid, 'Geral', '#6366f1', 0)
on conflict (id) do nothing;

-- Lista 'Backlog' com UUID fixo, pertencente ao espaço 'Geral'
insert into task_lists (id, space_id, name, color, position)
values ('00000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'Backlog', '#8b5cf6', 0)
on conflict (id) do nothing;

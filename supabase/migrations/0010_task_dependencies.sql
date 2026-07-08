-- ============================================================
-- Outlier OS — Task Dependencies
-- Permite marcar relações de bloqueio/relacionamento entre tarefas
-- ============================================================

create table task_dependencies (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_id uuid not null references tasks(id) on delete cascade,
  type text not null default 'blocks',
  -- 'blocks': task_id bloqueia depends_on_id
  -- 'blocked_by': task_id é bloqueado por depends_on_id
  -- 'related': apenas relacionado
  created_at timestamptz not null default now(),
  unique(task_id, depends_on_id)
);

create index idx_task_dependencies_task on task_dependencies(task_id);
create index idx_task_dependencies_depends_on on task_dependencies(depends_on_id);

alter table task_dependencies enable row level security;

create policy "task_dependencies_module" on task_dependencies
  for all using (has_module(auth.uid(), 'tarefas'));

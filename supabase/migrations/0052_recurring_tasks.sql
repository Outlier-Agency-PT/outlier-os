-- ============================================================
-- 0052: Tarefas recorrentes
-- Adiciona suporte a recorrência diária e semanal nas tasks
-- ============================================================

create type public.task_recurrence_frequency as enum (
  'daily',
  'weekly'
);

alter table public.tasks
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_frequency task_recurrence_frequency null,
  add column if not exists recurrence_day_of_week int null,
  add column if not exists recurrence_template_id uuid null
    references public.tasks(id) on delete set null;

create index if not exists idx_tasks_recurring on tasks(is_recurring)
  where is_recurring = true;

create index if not exists idx_tasks_recurrence_template on tasks(recurrence_template_id)
  where recurrence_template_id is not null;

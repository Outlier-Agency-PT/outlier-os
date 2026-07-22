-- ============================================
-- 0040_weekly_checkpoints.sql
-- Checkpoint Semanal por Departamento
-- ============================================

-- 0. Limpeza (execução idempotente após falha parcial)
drop table if exists public.weekly_checkpoints cascade;
drop table if exists public.team_member_departments cascade;

do $$ begin drop type public.checkpoint_department; exception when undefined_object then null; end $$;
do $$ begin drop type public.checkpoint_status;    exception when undefined_object then null; end $$;

-- 1. Enums
do $$ begin
  create type public.checkpoint_department as enum (
    'trafego', 'incubadora', 'vendas', 'desenvolvimento'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.checkpoint_status as enum (
    'draft', 'submitted'
  );
exception when duplicate_object then null;
end $$;

-- 2. Tabela de associação membro ↔ departamento
-- Permite uma pessoa pertencer a vários departamentos
create table public.team_member_departments (
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  department_code text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (team_member_id, department_code),
  constraint tmd_code_check check (
    department_code in (
      'trafego','incubadora','vendas','desenvolvimento',
      'gestao','operacoes','conteudo'
    )
  )
);

alter table public.team_member_departments enable row level security;

drop policy if exists "admins manage team_member_departments" on public.team_member_departments;
create policy "admins manage team_member_departments"
  on public.team_member_departments for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.role = 'admin'
    )
  );

drop policy if exists "members read own departments" on public.team_member_departments;
create policy "members read own departments"
  on public.team_member_departments for select
  using (team_member_id = auth.uid());

-- 3. Tabela principal de checkpoints semanais
create table public.weekly_checkpoints (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  department public.checkpoint_department not null,
  metrics jsonb not null default '{}'::jsonb,
  notes varchar(300),
  status public.checkpoint_status not null default 'draft',
  submitted_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_checkpoints_week_is_monday
    check (extract(isodow from week_start) = 1),
  constraint weekly_checkpoints_department_week_unique
    unique (department, week_start),
  constraint weekly_checkpoints_metrics_is_object
    check (jsonb_typeof(metrics) = 'object')
);

comment on table public.weekly_checkpoints is
  'Checkpoint semanal oficial por departamento. Um registo por departamento por segunda-feira.';

comment on column public.weekly_checkpoints.metrics is
  'Shape por departamento:
   trafego: {ad_spend, leads_generated, qualified_leads, meetings_booked, sales_attributed, revenue_attributed, campaigns_launched}
   incubadora: {active_students, students_at_risk, imminent_dropout, new_student_revenue, level_progressions, coaching_interactions, critical_cases, snapshot_time}
   vendas: {new_leads, mql, sql, meetings_held, sales_closed, no_shows, follow_up_open}
   desenvolvimento: {tasks_completed, tasks_open, tasks_overdue, releases_published, bugs_fixed, critical_incidents, critical_incidents_open, snapshot_time}';

create index if not exists weekly_checkpoints_week_start_idx
  on public.weekly_checkpoints (week_start desc);

create index if not exists weekly_checkpoints_department_idx
  on public.weekly_checkpoints (department, week_start desc);

-- Trigger updated_at usando a função canónica existente no projeto
drop trigger if exists set_weekly_checkpoints_updated_at on public.weekly_checkpoints;
create trigger set_weekly_checkpoints_updated_at
  before update on public.weekly_checkpoints
  for each row execute function public.trg_set_updated_at();

alter table public.weekly_checkpoints enable row level security;

drop policy if exists "team members read checkpoints" on public.weekly_checkpoints;
create policy "team members read checkpoints"
  on public.weekly_checkpoints for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.active = true
    )
  );

drop policy if exists "department members create checkpoints" on public.weekly_checkpoints;
create policy "department members create checkpoints"
  on public.weekly_checkpoints for insert
  with check (
    created_by = auth.uid()
    and (
      exists (
        select 1 from public.team_members tm
        where tm.id = auth.uid() and tm.role = 'admin'
      )
      or exists (
        select 1 from public.team_member_departments tmd
        where tmd.team_member_id = auth.uid()
        and tmd.department_code = department::text
      )
    )
  );

drop policy if exists "department members update checkpoints" on public.weekly_checkpoints;
create policy "department members update checkpoints"
  on public.weekly_checkpoints for update
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.role = 'admin'
    )
    or exists (
      select 1 from public.team_member_departments tmd
      where tmd.team_member_id = auth.uid()
      and tmd.department_code = department::text
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.role = 'admin'
    )
    or exists (
      select 1 from public.team_member_departments tmd
      where tmd.team_member_id = auth.uid()
      and tmd.department_code = department::text
    )
  );

drop policy if exists "admins delete checkpoints" on public.weekly_checkpoints;
create policy "admins delete checkpoints"
  on public.weekly_checkpoints for delete
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.role = 'admin'
    )
  );

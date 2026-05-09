-- ============================================================
-- Outlier OS — Initial Schema
-- 24 core tables + indexes
-- Generated: 2026-05-09
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type client_type as enum ('one_shot', 'long_term', 'interno');
create type student_level as enum ('aprendiz', 'fazedor', 'autoridade', 'referencia', 'aguardar');
create type task_priority as enum ('sem_prioridade', 'baixa', 'media', 'alta', 'urgente');
create type confidence_level as enum ('baixa', 'media', 'alta');
create type quarter_label as enum ('Q1', 'Q2', 'Q3', 'Q4');
create type transaction_type as enum ('receita', 'despesa');
create type recurring_frequency as enum ('mensal', 'trimestral', 'semestral', 'anual');
create type report_type as enum ('semanal', 'mensal');
create type report_status as enum ('rascunho', 'publicado');
create type member_role as enum ('admin', 'membro');

-- ============================================================
-- IDENTITY & TEAM
-- ============================================================

-- team_members extends auth.users with profile + permissions
create table team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role member_role not null default 'membro',
  department text,
  job_title text,
  avatar_url text,
  -- Permissões granulares: array de módulos permitidos. Admin ignora.
  -- Módulos válidos: dashboard, clientes, tarefas, lancamentos, conteudo,
  -- incubadora, relatorios, financeiro, okrs, processos, reunioes, equipa, configuracoes
  permissions_modules text[] not null default array[]::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_team_members_active on team_members(active);
create index idx_team_members_role on team_members(role);

-- ============================================================
-- STATUS TABLES (todas editáveis pelo admin)
-- ============================================================

create table client_statuses (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,        -- 'ativo', 'pausado', etc
  label text not null,             -- 'Ativo'
  color text not null,             -- hex
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table task_statuses (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  color text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table launch_statuses (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  color text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table content_statuses (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  color text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTES
-- ============================================================

create table clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_type client_type not null,
  status_id uuid references client_statuses(id),
  responsible_id uuid references team_members(id),
  contact_name text,
  email text,
  phone text,
  website text,
  sector text,
  monthly_value numeric(10, 2),
  start_date date,
  end_date date,
  notes text,
  -- Token único para dashboard partilhado público
  public_share_token text unique default encode(gen_random_bytes(16), 'hex'),
  public_share_enabled boolean not null default false,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_status on clients(status_id);
create index idx_clients_responsible on clients(responsible_id);
create index idx_clients_type on clients(client_type);
create index idx_clients_share_token on clients(public_share_token) where public_share_enabled = true;

-- ============================================================
-- LAUNCH TEMPLATES
-- ============================================================

create table launch_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tier text,                     -- 'master', 'premium', 'traffic', null
  duration_days int,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table launch_template_tasks (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references launch_templates(id) on delete cascade,
  title text not null,
  description text,
  day_offset int not null default 0,    -- dias a partir do início do lançamento
  default_priority task_priority,
  default_assignee_role text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_template_tasks_template on launch_template_tasks(template_id);

-- ============================================================
-- LANÇAMENTOS
-- ============================================================

create table launches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_id uuid references clients(id) on delete cascade,
  status_id uuid references launch_statuses(id),
  tier text,
  template_id uuid references launch_templates(id),
  start_date date,
  end_date date,
  description text,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_launches_client on launches(client_id);
create index idx_launches_status on launches(status_id);

create table launch_comments (
  id uuid primary key default uuid_generate_v4(),
  launch_id uuid not null references launches(id) on delete cascade,
  author_id uuid references team_members(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TAREFAS
-- ============================================================

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status_id uuid references task_statuses(id),
  priority task_priority not null default 'sem_prioridade',
  client_id uuid references clients(id) on delete set null,
  launch_id uuid references launches(id) on delete set null,
  assignee_id uuid references team_members(id),
  due_date date,
  completed_at timestamptz,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_status on tasks(status_id);
create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_client on tasks(client_id);
create index idx_tasks_launch on tasks(launch_id);
create index idx_tasks_due_date on tasks(due_date);

create table task_time_logs (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references team_members(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz,
  duration_minutes int,            -- calculado quando end_at é preenchido OU manual
  is_manual boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create index idx_time_logs_task on task_time_logs(task_id);
create index idx_time_logs_member on task_time_logs(member_id);

create table task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references team_members(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CONTEÚDO
-- ============================================================

create table contents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_id uuid references clients(id) on delete cascade,
  launch_id uuid references launches(id) on delete set null,
  status_id uuid references content_statuses(id),
  format text,                    -- reel, carrossel, post, story, video, etc
  platforms text[] default array[]::text[],  -- ['instagram', 'youtube', 'tiktok', 'linkedin']
  objective text,
  copy_post text,
  copy_design text,
  publish_date timestamptz,
  notes text,
  responsible_id uuid references team_members(id),
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contents_client on contents(client_id);
create index idx_contents_status on contents(status_id);
create index idx_contents_launch on contents(launch_id);
create index idx_contents_publish_date on contents(publish_date);

create table content_files (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid not null references contents(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references team_members(id),
  created_at timestamptz not null default now()
);

create index idx_content_files_content on content_files(content_id);

-- Feedback do cliente sobre conteúdo (acessível via dashboard partilhado)
create table content_feedback (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references contents(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  -- Quem comentou: nome livre (cliente externo) ou team_member_id
  author_name text,
  author_member_id uuid references team_members(id),
  body text not null,
  is_from_client boolean not null default false,
  parent_id uuid references content_feedback(id) on delete cascade,  -- threads
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references team_members(id),
  read_by_team boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_feedback_client on content_feedback(client_id);
create index idx_feedback_content on content_feedback(content_id);
create index idx_feedback_unread on content_feedback(client_id) where resolved = false and read_by_team = false;

-- ============================================================
-- INCUBADORA
-- ============================================================

create table students (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  instagram text,
  nicho text,
  subnicho text,
  coach_id uuid references team_members(id),
  level student_level not null default 'aprendiz',
  turma text,
  entry_type text,                  -- 'organico', 'pago', 'indicacao', etc
  status text not null default 'ativo',
  start_date date,
  end_date date,
  briefing text,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_coach on students(coach_id);
create index idx_students_level on students(level);

create table student_session_types (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,         -- 'sessao_inicial', 'hotseat_1', 'sessao_estrategica_1', etc
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table student_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  type_id uuid not null references student_session_types(id),
  scheduled_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_sessions_student on student_sessions(student_id);

-- ============================================================
-- RELATÓRIOS
-- ============================================================

create table reports (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  type report_type not null default 'semanal',
  status report_status not null default 'rascunho',
  period_start date not null,
  period_end date not null,
  -- KPIs computados (snapshot no momento da geração)
  kpis jsonb not null default '{}'::jsonb,
  -- Conteúdo do relatório em markdown
  content_md text,
  generated_by uuid references team_members(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reports_client on reports(client_id);
create index idx_reports_period on reports(period_start, period_end);

-- ============================================================
-- FINANCEIRO
-- ============================================================

create table financial_categories (
  id uuid primary key default uuid_generate_v4(),
  type transaction_type not null,
  name text not null,
  color text not null default '#10B981',
  is_default boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (type, name)
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  type transaction_type not null,
  amount numeric(10, 2) not null,
  description text not null,
  category_id uuid references financial_categories(id),
  client_id uuid references clients(id) on delete set null,
  transaction_date date not null,
  notes text,
  -- Para transações geradas a partir de recorrentes (FK adicionada depois para evitar forward ref)
  recurring_id uuid,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now()
);

create index idx_transactions_date on transactions(transaction_date);
create index idx_transactions_category on transactions(category_id);
create index idx_transactions_client on transactions(client_id);
create index idx_transactions_type on transactions(type);

create table recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  type transaction_type not null,
  amount numeric(10, 2) not null,
  description text not null,
  category_id uuid references financial_categories(id),
  client_id uuid references clients(id) on delete set null,
  frequency recurring_frequency not null default 'mensal',
  day_of_month int not null default 1,
  start_date date not null,
  end_date date,
  active boolean not null default true,
  last_generated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK adiada (recurring_transactions definida depois de transactions)
alter table transactions
  add constraint transactions_recurring_fk
  foreign key (recurring_id) references recurring_transactions(id) on delete set null;

-- ============================================================
-- OKRs
-- ============================================================

create table objectives (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  quarter quarter_label not null,
  year int not null,
  department text,
  confidence confidence_level,
  status text not null default 'em_progresso',
  responsible_ids uuid[] default array[]::uuid[],
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_objectives_quarter_year on objectives(year, quarter);
create index idx_objectives_department on objectives(department);

create table key_results (
  id uuid primary key default uuid_generate_v4(),
  objective_id uuid not null references objectives(id) on delete cascade,
  title text not null,
  initial_value numeric not null default 0,
  current_value numeric not null default 0,
  target_value numeric not null,
  deadline date,
  responsible_ids uuid[] default array[]::uuid[],
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_key_results_objective on key_results(objective_id);

-- ============================================================
-- PROCESSOS & SOPs
-- ============================================================

create table process_categories (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  color text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table processes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category_id uuid references process_categories(id),
  -- Conteúdo em formato TipTap JSON
  content_json jsonb,
  -- Versão markdown para pesquisa/exportação
  content_md text,
  miro_link text,
  external_links jsonb default '[]'::jsonb,    -- [{label, url}]
  tags text[] default array[]::text[],
  published boolean not null default true,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_processes_category on processes(category_id);
create index idx_processes_published on processes(published);
create index idx_processes_tags on processes using gin(tags);

-- ============================================================
-- REUNIÕES
-- ============================================================

create table meetings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  client_id uuid references clients(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  location text,                    -- 'online', 'escritorio', URL Zoom, etc
  agenda_md text,
  notes_md text,
  attendee_ids uuid[] default array[]::uuid[],
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meetings_scheduled on meetings(scheduled_at);
create index idx_meetings_client on meetings(client_id);

-- ============================================================
-- SISTEMA
-- ============================================================

create table favorites (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references team_members(id) on delete cascade,
  item_type text not null,           -- 'client', 'task', 'launch', 'content', etc
  item_id uuid not null,
  label text,                        -- snapshot do título no momento de favoritar
  created_at timestamptz not null default now(),
  unique (member_id, item_type, item_id)
);

create index idx_favorites_member on favorites(member_id);

create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references team_members(id) on delete set null,
  action text not null,              -- 'created', 'updated', 'completed', 'commented', etc
  entity_type text not null,         -- 'client', 'task', 'launch', etc
  entity_id uuid,
  entity_label text,                 -- snapshot do nome
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_member on activity_log(member_id);
create index idx_activity_entity on activity_log(entity_type, entity_id);
create index idx_activity_created on activity_log(created_at desc);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

create or replace function trg_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'team_members', 'clients', 'launches', 'launch_templates', 'tasks',
    'contents', 'students', 'reports', 'recurring_transactions',
    'objectives', 'key_results', 'processes', 'meetings'
  ])
  loop
    execute format(
      'create trigger set_updated_at before update on %I
       for each row execute function trg_set_updated_at()',
      t
    );
  end loop;
end$$;

-- ============================================================
-- TRIGGER — auto-create team_member on auth signup
-- ============================================================

create or replace function trg_handle_new_user()
returns trigger as $$
begin
  insert into team_members (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    -- primeiro user fica admin automaticamente
    case when (select count(*) from team_members) = 0 then 'admin'::member_role else 'membro'::member_role end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function trg_handle_new_user();

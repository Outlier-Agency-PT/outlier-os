-- ============================================================
-- Outlier OS — Row Level Security Policies
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function is_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from team_members
    where id = uid and role = 'admin' and active = true
  );
$$ language sql stable security definer;

create or replace function is_team_member(uid uuid)
returns boolean as $$
  select exists (
    select 1 from team_members
    where id = uid and active = true
  );
$$ language sql stable security definer;

create or replace function has_module(uid uuid, module text)
returns boolean as $$
  select exists (
    select 1 from team_members
    where id = uid
      and active = true
      and (role = 'admin' or module = any(permissions_modules))
  );
$$ language sql stable security definer;

-- ============================================================
-- ENABLE RLS EM TODAS AS TABELAS
-- ============================================================

alter table team_members enable row level security;
alter table client_statuses enable row level security;
alter table task_statuses enable row level security;
alter table launch_statuses enable row level security;
alter table content_statuses enable row level security;
alter table clients enable row level security;
alter table launch_templates enable row level security;
alter table launch_template_tasks enable row level security;
alter table launches enable row level security;
alter table launch_comments enable row level security;
alter table tasks enable row level security;
alter table task_time_logs enable row level security;
alter table task_comments enable row level security;
alter table contents enable row level security;
alter table content_files enable row level security;
alter table content_feedback enable row level security;
alter table students enable row level security;
alter table student_session_types enable row level security;
alter table student_sessions enable row level security;
alter table reports enable row level security;
alter table financial_categories enable row level security;
alter table transactions enable row level security;
alter table recurring_transactions enable row level security;
alter table objectives enable row level security;
alter table key_results enable row level security;
alter table process_categories enable row level security;
alter table processes enable row level security;
alter table meetings enable row level security;
alter table favorites enable row level security;
alter table activity_log enable row level security;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

create policy "team_members_select" on team_members
  for select using (is_team_member(auth.uid()));

create policy "team_members_update_self" on team_members
  for update using (id = auth.uid());

create policy "team_members_admin_all" on team_members
  for all using (is_admin(auth.uid()));

-- ============================================================
-- STATUS TABLES — leitura todos, escrita admin
-- ============================================================

create policy "client_statuses_select" on client_statuses
  for select using (is_team_member(auth.uid()));
create policy "client_statuses_admin" on client_statuses
  for all using (is_admin(auth.uid()));

create policy "task_statuses_select" on task_statuses
  for select using (is_team_member(auth.uid()));
create policy "task_statuses_admin" on task_statuses
  for all using (is_admin(auth.uid()));

create policy "launch_statuses_select" on launch_statuses
  for select using (is_team_member(auth.uid()));
create policy "launch_statuses_admin" on launch_statuses
  for all using (is_admin(auth.uid()));

create policy "content_statuses_select" on content_statuses
  for select using (is_team_member(auth.uid()));
create policy "content_statuses_admin" on content_statuses
  for all using (is_admin(auth.uid()));

create policy "process_categories_select" on process_categories
  for select using (is_team_member(auth.uid()));
create policy "process_categories_admin" on process_categories
  for all using (is_admin(auth.uid()));

create policy "financial_categories_select" on financial_categories
  for select using (has_module(auth.uid(), 'financeiro'));
create policy "financial_categories_admin" on financial_categories
  for all using (is_admin(auth.uid()));

create policy "session_types_select" on student_session_types
  for select using (has_module(auth.uid(), 'incubadora'));
create policy "session_types_admin" on student_session_types
  for all using (is_admin(auth.uid()));

-- ============================================================
-- CLIENTES
-- ============================================================

create policy "clients_module_access" on clients
  for all using (has_module(auth.uid(), 'clientes'));

-- Public read via share token (handled em queries via service_role com filtro)
create policy "clients_public_share" on clients
  for select using (public_share_enabled = true);

-- ============================================================
-- LAUNCHES
-- ============================================================

create policy "launches_module" on launches
  for all using (has_module(auth.uid(), 'lancamentos'));

create policy "launch_comments_module" on launch_comments
  for all using (has_module(auth.uid(), 'lancamentos'));

create policy "launch_templates_module" on launch_templates
  for all using (has_module(auth.uid(), 'lancamentos'));

create policy "launch_template_tasks_module" on launch_template_tasks
  for all using (has_module(auth.uid(), 'lancamentos'));

-- ============================================================
-- TASKS
-- ============================================================

create policy "tasks_module" on tasks
  for all using (has_module(auth.uid(), 'tarefas'));

create policy "task_time_logs_module" on task_time_logs
  for all using (has_module(auth.uid(), 'tarefas'));

create policy "task_comments_module" on task_comments
  for all using (has_module(auth.uid(), 'tarefas'));

-- ============================================================
-- CONTEÚDO
-- ============================================================

create policy "contents_module" on contents
  for all using (has_module(auth.uid(), 'conteudo'));

create policy "content_files_module" on content_files
  for all using (has_module(auth.uid(), 'conteudo'));

create policy "content_feedback_module" on content_feedback
  for all using (has_module(auth.uid(), 'conteudo'));

-- ============================================================
-- INCUBADORA
-- ============================================================

create policy "students_module" on students
  for all using (has_module(auth.uid(), 'incubadora'));

create policy "student_sessions_module" on student_sessions
  for all using (has_module(auth.uid(), 'incubadora'));

-- ============================================================
-- RELATÓRIOS
-- ============================================================

create policy "reports_module" on reports
  for all using (has_module(auth.uid(), 'relatorios'));

-- ============================================================
-- FINANCEIRO
-- ============================================================

create policy "transactions_module" on transactions
  for all using (has_module(auth.uid(), 'financeiro'));

create policy "recurring_module" on recurring_transactions
  for all using (has_module(auth.uid(), 'financeiro'));

-- ============================================================
-- OKRs
-- ============================================================

-- OKRs visíveis a todos os team members; só admin ou responsável edita
create policy "objectives_select" on objectives
  for select using (is_team_member(auth.uid()));

create policy "objectives_insert" on objectives
  for insert with check (has_module(auth.uid(), 'okrs'));

create policy "objectives_update" on objectives
  for update using (
    is_admin(auth.uid())
    or auth.uid() = any(responsible_ids)
    or created_by = auth.uid()
  );

create policy "objectives_delete" on objectives
  for delete using (is_admin(auth.uid()) or created_by = auth.uid());

create policy "key_results_select" on key_results
  for select using (is_team_member(auth.uid()));

create policy "key_results_modify" on key_results
  for all using (
    is_admin(auth.uid())
    or auth.uid() = any(responsible_ids)
    or exists (
      select 1 from objectives o
      where o.id = key_results.objective_id
        and (o.created_by = auth.uid() or auth.uid() = any(o.responsible_ids))
    )
  );

-- ============================================================
-- PROCESSOS & SOPs
-- ============================================================

create policy "processes_module" on processes
  for all using (has_module(auth.uid(), 'processos'));

-- ============================================================
-- REUNIÕES
-- ============================================================

create policy "meetings_module" on meetings
  for all using (has_module(auth.uid(), 'reunioes'));

-- ============================================================
-- SISTEMA
-- ============================================================

create policy "favorites_self" on favorites
  for all using (member_id = auth.uid());

create policy "activity_log_select" on activity_log
  for select using (is_team_member(auth.uid()));

create policy "activity_log_insert" on activity_log
  for insert with check (is_team_member(auth.uid()));

-- ============================================================
-- 0005 — Iniciativas, Mentorias e Decisões
-- Outlier OS — Decision Layer (Jun/2026)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type initiative_status as enum (
  'ideia',
  'planeamento',
  'em_curso',
  'em_pausa',
  'concluida',
  'cancelada'
);

create type initiative_priority as enum ('baixa', 'media', 'alta', 'critica');

create type initiative_source as enum (
  'interno',
  'cliente',
  'mentoria',
  'oportunidade',
  'crise'
);

create type initiative_health as enum ('verde', 'amarelo', 'vermelho');

create type mentorship_status as enum ('ativa', 'em_pausa', 'concluida', 'arquivada');

create type implementation_status as enum (
  'pendente',
  'a_implementar',
  'em_curso',
  'implementado',
  'parqueada'
);

create type decision_status as enum ('pendente', 'decidida', 'adiada', 'arquivada');

create type decision_impact as enum ('baixo', 'medio', 'alto', 'critico');

-- ============================================================
-- MENTORIAS (declarada antes porque initiatives faz fk)
-- ============================================================

create table mentorships (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mentor text,
  platform text,
  url text,
  description text,
  started_at date,
  status mentorship_status not null default 'ativa',
  total_modules int,
  notes text,
  cover_emoji text default '🎓',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_mentorships_status on mentorships(status);

create trigger set_updated_at before update on mentorships
  for each row execute function trg_set_updated_at();

-- Aulas/módulos dentro de cada programa
create table mentorship_modules (
  id uuid primary key default uuid_generate_v4(),
  mentorship_id uuid not null references mentorships(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  consumed_at date,
  duration_minutes int,
  key_insights text,
  raw_notes text,
  created_at timestamptz not null default now()
);

create index idx_mentorship_modules_mentorship on mentorship_modules(mentorship_id);
create index idx_mentorship_modules_consumed on mentorship_modules(consumed_at) where consumed_at is not null;

-- ============================================================
-- INICIATIVAS (projetos estratégicos — acima de tasks e launches)
-- ============================================================

create table initiatives (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status initiative_status not null default 'ideia',
  priority initiative_priority not null default 'media',
  source initiative_source not null default 'interno',
  health initiative_health,
  -- Owner e responsabilidade
  owner_id uuid references team_members(id) on delete set null,
  created_by uuid references team_members(id) on delete set null,
  -- Cabeça de série da semana
  next_step text,
  blocker text,
  focus_this_week boolean not null default false,
  needs_decision boolean not null default false,
  decision_context text,
  -- Esforço vs impacto
  expected_impact text,
  expected_effort text,
  -- Ligações opcionais
  client_id uuid references clients(id) on delete set null,
  mentorship_id uuid references mentorships(id) on delete set null,
  parent_initiative_id uuid references initiatives(id) on delete set null,
  -- Datas
  start_date date,
  target_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  -- Tags livres
  tags text[] not null default array[]::text[],
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_initiatives_status on initiatives(status);
create index idx_initiatives_focus on initiatives(focus_this_week) where focus_this_week = true;
create index idx_initiatives_needs_decision on initiatives(needs_decision) where needs_decision = true;
create index idx_initiatives_owner on initiatives(owner_id);
create index idx_initiatives_client on initiatives(client_id);
create index idx_initiatives_mentorship on initiatives(mentorship_id);

create trigger set_updated_at before update on initiatives
  for each row execute function trg_set_updated_at();

-- Timeline de updates por iniciativa
create table initiative_updates (
  id uuid primary key default uuid_generate_v4(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  content text not null,
  author_id uuid references team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_initiative_updates_initiative on initiative_updates(initiative_id, created_at desc);

-- ============================================================
-- AÇÕES DE IMPLEMENTAÇÃO (vêm de módulos de mentoria)
-- ============================================================

create table implementation_actions (
  id uuid primary key default uuid_generate_v4(),
  mentorship_id uuid not null references mentorships(id) on delete cascade,
  module_id uuid references mentorship_modules(id) on delete set null,
  action text not null,
  why text,
  priority task_priority not null default 'media',
  status implementation_status not null default 'pendente',
  due_date date,
  task_id uuid references tasks(id) on delete set null,
  initiative_id uuid references initiatives(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_implementation_status on implementation_actions(status);
create index idx_implementation_mentorship on implementation_actions(mentorship_id);
create index idx_implementation_module on implementation_actions(module_id);

-- ============================================================
-- DECISÕES (queue do CEO)
-- ============================================================

create table decisions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  context text,
  options text,
  status decision_status not null default 'pendente',
  impact decision_impact,
  urgency text,
  initiative_id uuid references initiatives(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  mentorship_id uuid references mentorships(id) on delete set null,
  decided_at timestamptz,
  decision text,
  decided_by uuid references team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_decisions_status on decisions(status);
create index idx_decisions_impact on decisions(impact);
create index idx_decisions_initiative on decisions(initiative_id);
create index idx_decisions_client on decisions(client_id);
create index idx_decisions_mentorship on decisions(mentorship_id);

create trigger set_updated_at before update on decisions
  for each row execute function trg_set_updated_at();

-- ============================================================
-- RLS POLICIES (consistente com 0002 — todos team_members podem ler/escrever)
-- ============================================================

alter table initiatives enable row level security;
alter table initiative_updates enable row level security;
alter table mentorships enable row level security;
alter table mentorship_modules enable row level security;
alter table implementation_actions enable row level security;
alter table decisions enable row level security;

-- INICIATIVAS — qualquer team_member com módulo
create policy initiatives_select on initiatives for select to authenticated
  using (has_module(auth.uid(), 'iniciativas'));
create policy initiatives_insert on initiatives for insert to authenticated
  with check (has_module(auth.uid(), 'iniciativas'));
create policy initiatives_update on initiatives for update to authenticated
  using (has_module(auth.uid(), 'iniciativas'));
create policy initiatives_delete on initiatives for delete to authenticated
  using (is_admin(auth.uid()));

create policy initiative_updates_select on initiative_updates for select to authenticated
  using (has_module(auth.uid(), 'iniciativas'));
create policy initiative_updates_insert on initiative_updates for insert to authenticated
  with check (has_module(auth.uid(), 'iniciativas'));
create policy initiative_updates_delete on initiative_updates for delete to authenticated
  using (is_admin(auth.uid()));

-- MENTORIAS — só admin (são pessoais do Daniel)
create policy mentorships_select on mentorships for select to authenticated
  using (is_admin(auth.uid()));
create policy mentorships_all on mentorships for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy mentorship_modules_select on mentorship_modules for select to authenticated
  using (is_admin(auth.uid()));
create policy mentorship_modules_all on mentorship_modules for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy implementation_actions_select on implementation_actions for select to authenticated
  using (is_admin(auth.uid()));
create policy implementation_actions_all on implementation_actions for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- DECISÕES — visível a todos os admins
create policy decisions_select on decisions for select to authenticated
  using (is_admin(auth.uid()));
create policy decisions_all on decisions for all to authenticated
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ============================================================
-- ACTIVITY LOG TRIGGERS (consistente com 0004)
-- ============================================================

create trigger log_initiatives_activity
  after insert or update or delete on initiatives
  for each row execute function trg_log_activity();

create trigger log_decisions_activity
  after insert or update or delete on decisions
  for each row execute function trg_log_activity();

create trigger log_mentorships_activity
  after insert or update or delete on mentorships
  for each row execute function trg_log_activity();

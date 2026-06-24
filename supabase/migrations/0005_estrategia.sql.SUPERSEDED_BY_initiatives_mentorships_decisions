-- ============================================================
-- Outlier OS — Camada Estratégica
-- Iniciativas, Mentorias e Decisões (CEO board)
-- ============================================================

create type initiative_status as enum (
  'ideia', 'planeamento', 'em_curso', 'em_pausa', 'concluida', 'cancelada'
);
create type initiative_priority as enum ('baixa', 'media', 'alta', 'critica');
create type initiative_source as enum (
  'interno', 'cliente', 'mentoria', 'oportunidade', 'crise'
);
create type initiative_health as enum ('verde', 'amarelo', 'vermelho');

create type mentorship_status as enum ('ativa', 'em_pausa', 'concluida', 'arquivada');

create type implementation_status as enum (
  'pendente', 'a_implementar', 'em_curso', 'implementado', 'parqueada'
);

create type decision_status as enum ('pendente', 'decidida', 'adiada', 'arquivada');
create type decision_impact as enum ('baixo', 'medio', 'alto', 'critico');

-- ============================================================
-- MENTORIAS (criar antes porque iniciativas/decisões referenciam)
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
  cover_emoji text not null default '🎓',
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_mentorships_status on mentorships(status);

create table mentorship_modules (
  id uuid primary key default uuid_generate_v4(),
  mentorship_id uuid not null references mentorships(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  consumed_at timestamptz,
  duration_minutes int,
  key_insights text,
  raw_notes text,
  created_at timestamptz not null default now()
);

create index idx_mentorship_modules_mentorship on mentorship_modules(mentorship_id);

-- ============================================================
-- INICIATIVAS
-- ============================================================

create table initiatives (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status initiative_status not null default 'ideia',
  priority initiative_priority not null default 'media',
  source initiative_source not null default 'interno',
  health initiative_health,
  owner_id uuid references team_members(id),
  created_by uuid references team_members(id),
  next_step text,
  blocker text,
  focus_this_week boolean not null default false,
  needs_decision boolean not null default false,
  decision_context text,
  expected_impact text,
  expected_effort text,
  client_id uuid references clients(id) on delete set null,
  mentorship_id uuid references mentorships(id) on delete set null,
  parent_initiative_id uuid references initiatives(id) on delete set null,
  start_date date,
  target_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_initiatives_status on initiatives(status);
create index idx_initiatives_owner on initiatives(owner_id);
create index idx_initiatives_focus on initiatives(focus_this_week) where focus_this_week = true;
create index idx_initiatives_needs_decision on initiatives(needs_decision) where needs_decision = true;
create index idx_initiatives_client on initiatives(client_id);
create index idx_initiatives_mentorship on initiatives(mentorship_id);

create table initiative_updates (
  id uuid primary key default uuid_generate_v4(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  content text not null,
  author_id uuid references team_members(id),
  created_at timestamptz not null default now()
);

create index idx_initiative_updates_initiative on initiative_updates(initiative_id);

-- ============================================================
-- IMPLEMENTATION ACTIONS (das mentorias)
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
  created_by uuid references team_members(id),
  created_at timestamptz not null default now()
);

create index idx_implementation_mentorship on implementation_actions(mentorship_id);
create index idx_implementation_status on implementation_actions(status);

-- ============================================================
-- DECISÕES
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
  decided_by uuid references team_members(id),
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_decisions_status on decisions(status);
create index idx_decisions_initiative on decisions(initiative_id);
create index idx_decisions_client on decisions(client_id);

-- ============================================================
-- TRIGGERS (updated_at)
-- ============================================================

create trigger set_updated_at before update on mentorships
  for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on initiatives
  for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on decisions
  for each row execute function trg_set_updated_at();

-- ============================================================
-- ACTIVITY LOG triggers
-- ============================================================

create trigger log_activity after insert or update or delete on initiatives
  for each row execute function trg_log_activity();
create trigger log_activity after insert or update or delete on decisions
  for each row execute function trg_log_activity();
create trigger log_activity after insert or update or delete on mentorships
  for each row execute function trg_log_activity();

-- ============================================================
-- RLS
-- ============================================================

alter table mentorships enable row level security;
alter table mentorship_modules enable row level security;
alter table initiatives enable row level security;
alter table initiative_updates enable row level security;
alter table implementation_actions enable row level security;
alter table decisions enable row level security;

create policy "mentorships_module" on mentorships
  for all using (has_module(auth.uid(), 'mentorias'));
create policy "mentorship_modules_module" on mentorship_modules
  for all using (has_module(auth.uid(), 'mentorias'));
create policy "implementation_actions_module" on implementation_actions
  for all using (has_module(auth.uid(), 'mentorias'));

create policy "initiatives_module" on initiatives
  for all using (has_module(auth.uid(), 'iniciativas'));
create policy "initiative_updates_module" on initiative_updates
  for all using (has_module(auth.uid(), 'iniciativas'));

create policy "decisions_module" on decisions
  for all using (has_module(auth.uid(), 'decisoes'));

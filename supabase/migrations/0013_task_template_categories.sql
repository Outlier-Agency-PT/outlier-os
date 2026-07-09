-- ============================================================
-- Outlier OS — Task Template Categories + Item Fields
-- 09 Jul 2026
-- ============================================================

-- ============================================================
-- TASK_TEMPLATE_CATEGORIES
-- ============================================================

create table task_template_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#A12B2B',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table task_template_categories enable row level security;

create policy "task_template_categories_select" on task_template_categories
  for select using (is_team_member(auth.uid()));

create policy "task_template_categories_insert" on task_template_categories
  for insert with check (is_admin(auth.uid()));

create policy "task_template_categories_update" on task_template_categories
  for update using (is_admin(auth.uid()));

create policy "task_template_categories_delete" on task_template_categories
  for delete using (is_admin(auth.uid()));

-- ============================================================
-- SEED — Categorias iniciais
-- ============================================================

insert into task_template_categories (name, color, sort_order) values
  ('Onboarding', '#2B9E8F', 1),
  ('Lançamento', '#A12B2B', 2),
  ('Interno',    '#6366f1', 3),
  ('Outro',      '#888888', 4);

-- ============================================================
-- ALTER task_templates — adiciona category_id
-- ============================================================

alter table task_templates
  add column if not exists category_id uuid references task_template_categories(id) on delete set null;

create index if not exists idx_task_templates_category on task_templates(category_id);

-- ============================================================
-- ALTER task_template_items — novos campos
-- ============================================================

alter table task_template_items
  add column if not exists default_assignee_id uuid references team_members(id) on delete set null,
  add column if not exists day_offset int not null default 0,
  add column if not exists default_status_id uuid references task_statuses(id) on delete set null;

create index if not exists idx_task_template_items_assignee on task_template_items(default_assignee_id);

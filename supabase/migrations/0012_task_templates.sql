-- ============================================================
-- Outlier OS — Task Templates
-- 09 Jul 2026
-- Templates de tarefas standalone (independentes de lançamentos)
-- ============================================================

-- ============================================================
-- TASK_TEMPLATES
-- ============================================================

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  space_id uuid references task_spaces(id) on delete set null,
  created_by uuid references team_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_task_templates_space on task_templates(space_id);

-- ============================================================
-- TASK_TEMPLATE_ITEMS
-- ============================================================

create table task_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references task_templates(id) on delete cascade,
  parent_item_id uuid references task_template_items(id) on delete cascade,
  title text not null,
  description text,
  priority task_priority not null default 'media',
  estimate_points int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_task_template_items_template on task_template_items(template_id);
create index idx_task_template_items_parent on task_template_items(parent_item_id);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================

create or replace function update_task_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger task_templates_updated_at
  before update on task_templates
  for each row execute procedure update_task_templates_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table task_templates enable row level security;
alter table task_template_items enable row level security;

create policy "task_templates_select" on task_templates
  for select using (is_team_member(auth.uid()));

create policy "task_templates_insert" on task_templates
  for insert with check (is_admin(auth.uid()));

create policy "task_templates_update" on task_templates
  for update using (is_admin(auth.uid()));

create policy "task_templates_delete" on task_templates
  for delete using (is_admin(auth.uid()));

create policy "task_template_items_select" on task_template_items
  for select using (is_team_member(auth.uid()));

create policy "task_template_items_insert" on task_template_items
  for insert with check (is_admin(auth.uid()));

create policy "task_template_items_update" on task_template_items
  for update using (is_admin(auth.uid()));

create policy "task_template_items_delete" on task_template_items
  for delete using (is_admin(auth.uid()));

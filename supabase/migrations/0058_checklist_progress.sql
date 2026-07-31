create table if not exists public.checklist_progress (
  id uuid primary key default uuid_generate_v4(),
  process_id uuid not null references public.processes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_index integer not null,
  completed_at timestamptz default now(),
  unique(process_id, user_id, item_index)
);

alter table public.checklist_progress enable row level security;

-- membro vê e gere o seu próprio progresso
create policy "checklist_progress_own" on public.checklist_progress
  for all using (auth.uid() = user_id);

-- admin vê tudo
create policy "checklist_progress_admin_read" on public.checklist_progress
  for select using (
    exists (
      select 1 from public.team_members
      where id = auth.uid() and role = 'admin' and active = true
    )
  );

create table public.student_tracks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  process_id uuid not null references public.processes(id),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz default now(),
  launch_date date,
  status text default 'ativa' check (status in ('ativa','pausada','concluida')),
  unique (student_id, process_id)
);

create table public.student_track_progress (
  id uuid primary key default uuid_generate_v4(),
  student_track_id uuid not null references public.student_tracks(id) on delete cascade,
  step_id uuid not null references public.process_steps(id),
  completed_at timestamptz,
  notes text,
  unique (student_track_id, step_id)
);

create index on public.student_tracks(student_id);
create index on public.student_track_progress(student_track_id);

alter table public.student_tracks enable row level security;
alter table public.student_track_progress enable row level security;

create policy "Autenticados podem ver student_tracks"
  on public.student_tracks for select
  to authenticated using (true);

create policy "Admins podem gerir student_tracks"
  on public.student_tracks for all
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid()
      and tm.active = true
    )
  );

create policy "Autenticados podem ver track_progress"
  on public.student_track_progress for select
  to authenticated using (true);

create policy "Admins podem gerir track_progress"
  on public.student_track_progress for all
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid()
      and tm.active = true
    )
  );
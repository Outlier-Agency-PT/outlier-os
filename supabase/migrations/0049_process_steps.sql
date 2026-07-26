create table public.process_steps (
  id uuid primary key default uuid_generate_v4(),
  process_id uuid not null references public.processes(id) on delete cascade,
  order_index integer not null,
  title text not null,
  description text,
  duration_days integer,
  is_optional boolean default false,
  week_number integer,
  created_at timestamptz default now()
);

create index on public.process_steps(process_id);

alter table public.process_steps enable row level security;

create policy "Autenticados podem ver steps"
  on public.process_steps for select
  to authenticated using (true);

create policy "Admins podem gerir steps"
  on public.process_steps for all
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid()
      and tm.active = true
    )
  );

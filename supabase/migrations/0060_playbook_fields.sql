alter table public.processes
  add column if not exists version text;

alter table public.processes
  add column if not exists last_reviewed_at timestamptz;

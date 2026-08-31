alter table public.processes
  add column if not exists subcategory text;

create index if not exists idx_processes_subcategory on public.processes(subcategory);

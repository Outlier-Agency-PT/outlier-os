alter table public.tasks
  add column if not exists recurrence_end_date date null;
-- null = repete indefinidamente

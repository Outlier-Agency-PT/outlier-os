alter table public.students
  add column if not exists suggested_level text,
  add column if not exists appears_in_sessions text,
  add column if not exists coach_notes text;

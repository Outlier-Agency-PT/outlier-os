alter table public.students
  add column if not exists mentoria_individual boolean default false,
  add column if not exists renewal_date_1 date,
  add column if not exists renewal_date_2 date,
  add column if not exists renewal_year_1 text,
  add column if not exists renewal_year_2 text,
  add column if not exists strategic_session_date date;

-- ============================================================
-- 0041: Campos de acompanhamento da coach por aluno
-- ============================================================

alter table public.students
  add column if not exists motivation text,
  add column if not exists priority text check (priority in ('alta', 'media', 'baixa'));

comment on column public.students.motivation is
  'Nota subjetiva da coach sobre motivação/estado do aluno. Visível apenas para staff.';
comment on column public.students.priority is
  'Prioridade de acompanhamento: alta, media, baixa. Visível apenas para staff.';

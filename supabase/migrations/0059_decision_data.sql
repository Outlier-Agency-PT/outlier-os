alter table public.processes
  add column if not exists decision_data jsonb;

comment on column public.processes.decision_data is
  'Campos estruturados para doc_type=decisao:
   { context, alternatives, decided_by_id, decided_by_name,
     decided_at, impact }';

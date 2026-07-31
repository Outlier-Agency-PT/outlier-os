alter table public.processes
  add column if not exists template_target text
  check (template_target in ('processo', 'briefing', 'tarefas'));

comment on column public.processes.template_target is
  'Destino da cópia quando doc_type=template:
   processo | briefing | tarefas';

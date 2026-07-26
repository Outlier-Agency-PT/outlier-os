alter table public.processes
  add column if not exists doc_type text not null default 'processo'
    check (doc_type in ('processo','playbook','guia','template',
                        'checklist','decisao','trilha'));

-- Add 'suggestion' as valid source value for tasks
alter table tasks drop constraint if exists tasks_source_check;
alter table tasks add constraint tasks_source_check
  check (source in ('manual', 'fireflies', 'recurring', 'template', 'suggestion'));

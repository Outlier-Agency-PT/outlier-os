-- Altera estimate_points de int para numeric em ambas as tabelas,
-- permitindo valores decimais (ex: 0.5, 1.5).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'estimate_points'
  ) then
    alter table tasks alter column estimate_points type numeric using estimate_points::numeric;
  else
    alter table tasks add column estimate_points numeric;
  end if;
end $$;

alter table task_template_items
  alter column estimate_points type numeric using estimate_points::numeric;

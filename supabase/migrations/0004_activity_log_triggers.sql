-- ============================================================
-- Outlier OS — Activity Log triggers
-- Loga INSERT/UPDATE/DELETE em tabelas core para feed Atividade
-- ============================================================

create or replace function trg_log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_action text;
  v_label text;
begin
  if (tg_op = 'INSERT') then v_action := 'created';
  elsif (tg_op = 'UPDATE') then v_action := 'updated';
  elsif (tg_op = 'DELETE') then v_action := 'deleted';
  else return null;
  end if;

  -- Tenta extrair label do registo
  if tg_op = 'DELETE' then
    if to_jsonb(old) ? 'name' then v_label := old.name;
    elsif to_jsonb(old) ? 'title' then v_label := old.title;
    end if;
  else
    if to_jsonb(new) ? 'name' then v_label := new.name;
    elsif to_jsonb(new) ? 'title' then v_label := new.title;
    end if;
  end if;

  insert into activity_log (member_id, action, entity_type, entity_id, entity_label)
  values (
    v_member,
    v_action,
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end), gen_random_uuid()),
    v_label
  );

  if (tg_op = 'DELETE') then return old; else return new; end if;
exception
  when others then
    -- Nunca bloquear a operação principal
    if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;

alter function trg_log_activity() owner to postgres;

-- Aplicar a tabelas core
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'clients', 'tasks', 'launches', 'contents', 'students',
    'objectives', 'meetings', 'processes', 'transactions'
  ])
  loop
    execute format(
      'drop trigger if exists log_activity on %I; create trigger log_activity after insert or update or delete on %I for each row execute function trg_log_activity()',
      t, t
    );
  end loop;
end$$;

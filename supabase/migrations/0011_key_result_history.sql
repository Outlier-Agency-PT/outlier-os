-- ============================================================
-- Outlier OS — Key Result History
-- Histórico automático de progresso via trigger
-- ============================================================

create table key_result_history (
  id            uuid        primary key default uuid_generate_v4(),
  key_result_id uuid        not null references key_results(id) on delete cascade,
  value         numeric     not null,
  recorded_by   uuid        references team_members(id) on delete set null,
  recorded_at   timestamptz not null default now()
);

create index idx_kr_history_kr_recorded
  on key_result_history (key_result_id, recorded_at desc);

-- ============================================================
-- Trigger: grava histórico em cada INSERT ou mudança de
-- current_value em key_results
-- ============================================================

create or replace function trg_record_kr_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT'
     or (TG_OP = 'UPDATE' and NEW.current_value is distinct from OLD.current_value)
  then
    insert into key_result_history (key_result_id, value, recorded_by, recorded_at)
    values (NEW.id, NEW.current_value, auth.uid(), now());
  end if;
  return NEW;
end;
$$;

create trigger kr_progress_history
  after insert or update of current_value on key_results
  for each row execute function trg_record_kr_progress();

-- ============================================================
-- Backfill: snapshot inicial para KRs já existentes sem histórico
-- recorded_by fica NULL porque não se sabe quem fez a alteração
-- ============================================================

insert into key_result_history (key_result_id, value, recorded_by, recorded_at)
select kr.id, kr.current_value, null, kr.updated_at
from   key_results kr
where  not exists (
  select 1 from key_result_history h where h.key_result_id = kr.id
);

-- ============================================================
-- RLS — SELECT para qualquer team member;
-- INSERT apenas via trigger (security definer), sem policy directa
-- ============================================================

alter table key_result_history enable row level security;

create policy "kr_history_select"
  on key_result_history
  for select
  using (is_team_member(auth.uid()));

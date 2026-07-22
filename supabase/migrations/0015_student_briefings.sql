-- ============================================================
-- Outlier OS — Student Briefings
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table student_briefings (
  id           uuid        primary key default gen_random_uuid(),
  student_id   uuid        not null references students(id) on delete cascade,
  unique (student_id),
  -- Passo 1: Negócio
  negocio      jsonb       not null default '{}',
  -- Passo 2: Produto
  produto      jsonb       not null default '{}',
  -- Passo 3: Audiência
  audiencia    jsonb       not null default '{}',
  -- Passo 4: Objecções (array de {objecao, resposta})
  objecoes     jsonb       not null default '[]',
  -- Passo 5: Estratégia
  estrategia   jsonb       not null default '{}',
  is_complete  boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger student_briefings_updated_at
  before update on student_briefings
  for each row execute function set_updated_at();

alter table student_briefings enable row level security;

-- Aluno vê/edita o próprio briefing (via students.user_id = auth.uid())
-- Equipa vê/edita todos
create policy "student_briefings_select" on student_briefings
  for select using (
    exists (
      select 1 from students
      where students.id = student_briefings.student_id
        and students.user_id = auth.uid()
    )
    or is_team_member(auth.uid())
  );

create policy "student_briefings_insert" on student_briefings
  for insert with check (
    exists (
      select 1 from students
      where students.id = student_briefings.student_id
        and students.user_id = auth.uid()
    )
    or is_team_member(auth.uid())
  );

create policy "student_briefings_update" on student_briefings
  for update using (
    exists (
      select 1 from students
      where students.id = student_briefings.student_id
        and students.user_id = auth.uid()
    )
    or is_team_member(auth.uid())
  );

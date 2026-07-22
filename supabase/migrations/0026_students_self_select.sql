-- ============================================================
-- 0026: Permite ao aluno ler o seu próprio registo em students
-- ============================================================
-- A policy existente "students_module" só cobre team members com
-- o módulo incubadora. Alunos autenticados precisam de SELECT no
-- próprio registo para que as subqueries de RLS em student_briefings,
-- student_launches, etc. (WHERE students.user_id = auth.uid()) funcionem.

create policy "students_select_own" on students
  for select
  to authenticated
  using (user_id = auth.uid() or is_team_member(auth.uid()));

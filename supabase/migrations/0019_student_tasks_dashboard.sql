-- ============================================================
-- 0019: Student Tasks Dashboard
-- Liga auth.users ↔ students e expõe tarefas ao aluno
-- ============================================================

-- 1. user_id na tabela students (liga CRM ao auth.users)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- 2. Campo de entrega nas tarefas
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS delivery_url text;

-- 3. Backfill: liga alunos existentes por email
UPDATE students s
SET user_id = au.id
FROM auth.users au
WHERE lower(s.email) = lower(au.email)
  AND s.user_id IS NULL;

-- 4. task_statuses — leitura para qualquer utilizador autenticado
--    (necessário para o join nas queries de tarefas dos alunos)
CREATE POLICY "task_statuses_authenticated_read"
  ON task_statuses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 5. task_spaces e task_lists — leitura para qualquer autenticado
--    (necessário para mostrar space/lista nas tarefas do aluno)
CREATE POLICY "task_spaces_authenticated_read"
  ON task_spaces FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "task_lists_authenticated_read"
  ON task_lists FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. tasks — alunos lêem as suas próprias tarefas
CREATE POLICY "tasks_student_select"
  ON tasks FOR SELECT
  USING (auth.uid() = ANY(assignees) OR auth.uid() = assignee_id);

-- 7. tasks — alunos actualizam delivery_url e completed_at nas suas tarefas
CREATE POLICY "tasks_student_update"
  ON tasks FOR UPDATE
  USING  (auth.uid() = ANY(assignees) OR auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = ANY(assignees) OR auth.uid() = assignee_id);

-- 8. students — aluno lê o próprio registo
CREATE POLICY "students_self_select"
  ON students FOR SELECT
  USING (user_id = auth.uid());

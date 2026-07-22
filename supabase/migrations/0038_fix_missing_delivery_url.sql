-- Fix: migration 0019 foi editada após já ter sido aplicada ao banco.
-- Apenas o primeiro statement (user_id em students) chegou a correr.
-- Confirmado via: erro "column tasks.delivery_url does not exist" ao
-- investigar bug de tarefas do aluno não aparecendo, e UPDATE silencioso
-- (RLS sem tasks_student_update bloqueia sem retornar error).
-- Este ficheiro aplica todos os statements em falta da 0019.

-- 1. Campo de entrega nas tarefas (estava em falta)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delivery_url text;

-- 2. task_statuses — leitura para qualquer utilizador autenticado
DO $$ BEGIN
  CREATE POLICY "task_statuses_authenticated_read"
    ON task_statuses FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. task_spaces — leitura para qualquer autenticado
DO $$ BEGIN
  CREATE POLICY "task_spaces_authenticated_read"
    ON task_spaces FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. task_lists — leitura para qualquer autenticado
DO $$ BEGIN
  CREATE POLICY "task_lists_authenticated_read"
    ON task_lists FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. tasks — alunos lêem as suas próprias tarefas
DO $$ BEGIN
  CREATE POLICY "tasks_student_select"
    ON tasks FOR SELECT
    USING (auth.uid() = ANY(assignees) OR auth.uid() = assignee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. tasks — alunos actualizam delivery_url e completed_at nas suas tarefas
DO $$ BEGIN
  CREATE POLICY "tasks_student_update"
    ON tasks FOR UPDATE
    USING  (auth.uid() = ANY(assignees) OR auth.uid() = assignee_id)
    WITH CHECK (auth.uid() = ANY(assignees) OR auth.uid() = assignee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. students — aluno lê o próprio registo
DO $$ BEGIN
  CREATE POLICY "students_self_select"
    ON students FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

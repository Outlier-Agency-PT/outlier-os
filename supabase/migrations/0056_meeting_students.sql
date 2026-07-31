-- ============================================================
-- 0056: Tabela de junção reuniões ↔ alunos
-- ============================================================

CREATE TABLE meeting_students (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, student_id)
);

CREATE INDEX idx_meeting_students_meeting ON meeting_students(meeting_id);
CREATE INDEX idx_meeting_students_student ON meeting_students(student_id);

ALTER TABLE meeting_students ENABLE ROW LEVEL SECURITY;

-- Staff vê todas as associações
CREATE POLICY meeting_students_select_staff
  ON meeting_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
  );

-- Aluno vê apenas as suas próprias associações
CREATE POLICY meeting_students_select_student
  ON meeting_students FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- Só staff pode inserir
CREATE POLICY meeting_students_insert_staff
  ON meeting_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
  );

-- Só staff pode apagar
CREATE POLICY meeting_students_delete_staff
  ON meeting_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
  );

-- ============================================================
-- Política adicional em meetings: alunos lêem as suas reuniões
-- (complementa a policy meetings_module que cobre o staff)
-- ============================================================

CREATE POLICY meetings_student_select
  ON meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meeting_students ms
      JOIN students s ON s.id = ms.student_id
      WHERE ms.meeting_id = meetings.id
        AND s.user_id = auth.uid()
    )
  );

-- Política adicional: todo o staff lê reuniões com alunos associados.
-- Cobre coaches que têm o módulo 'incubadora' mas não 'reunioes'.
CREATE POLICY meetings_staff_via_student_select
  ON meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
    AND EXISTS (
      SELECT 1 FROM meeting_students ms
      WHERE ms.meeting_id = meetings.id
    )
  );

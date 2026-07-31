-- ============================================================
-- 0055: Diário de Bordo do aluno (student_diary)
-- ============================================================

CREATE TABLE student_diary (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_diary_student ON student_diary(student_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON student_diary
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE student_diary ENABLE ROW LEVEL SECURITY;

-- Aluno vê as suas próprias entradas; staff vê todas
CREATE POLICY student_diary_select
  ON student_diary FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
  );

-- Só o aluno pode escrever as suas entradas
CREATE POLICY student_diary_insert
  ON student_diary FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY student_diary_update
  ON student_diary FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY student_diary_delete
  ON student_diary FOR DELETE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

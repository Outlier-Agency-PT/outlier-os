-- ============================================================
-- 0057: Relatórios automáticos por aluno (Incubadora)
-- ============================================================

CREATE TABLE student_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  generated_by uuid        REFERENCES team_members(id),
  title        text        NOT NULL,
  period_start date        NOT NULL,
  period_end   date        NOT NULL,
  kpis         jsonb       NOT NULL DEFAULT '{}',
  content_md   text,
  status       text        NOT NULL DEFAULT 'rascunho'
                           CHECK (status IN ('rascunho', 'publicado')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_reports_student ON student_reports(student_id);
CREATE INDEX idx_student_reports_period  ON student_reports(period_start, period_end);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON student_reports
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;

-- Staff (qualquer membro activo) gere todos os relatórios
CREATE POLICY student_reports_staff
  ON student_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid() AND active = true
    )
  );

-- Aluno vê apenas os seus relatórios publicados
CREATE POLICY student_reports_student_select
  ON student_reports FOR SELECT
  TO authenticated
  USING (
    status = 'publicado'
    AND student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

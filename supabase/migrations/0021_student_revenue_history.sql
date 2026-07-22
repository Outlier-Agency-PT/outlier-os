-- ============================================================
-- 0021: Histórico de receita dos alunos
-- ============================================================

CREATE TABLE student_revenue_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  value       numeric     NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  note        text
);

CREATE INDEX idx_student_revenue_history_student_recorded
  ON student_revenue_history (student_id, recorded_at DESC);

-- ============================================================
-- Trigger: regista histórico quando revenue_generated é alterado
-- ============================================================

CREATE OR REPLACE FUNCTION trg_record_student_revenue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.revenue_generated IS NOT NULL)
     OR (TG_OP = 'UPDATE'
         AND NEW.revenue_generated IS DISTINCT FROM OLD.revenue_generated
         AND NEW.revenue_generated IS NOT NULL)
  THEN
    INSERT INTO student_revenue_history (student_id, value, recorded_at)
    VALUES (NEW.id, NEW.revenue_generated, NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER students_revenue_history
  AFTER INSERT OR UPDATE OF revenue_generated ON students
  FOR EACH ROW EXECUTE FUNCTION trg_record_student_revenue();

-- ============================================================
-- Backfill: snapshot inicial para alunos com revenue_generated
-- ============================================================

INSERT INTO student_revenue_history (student_id, value, recorded_at)
SELECT id, revenue_generated, COALESCE(updated_at, created_at)
FROM students
WHERE revenue_generated IS NOT NULL
  AND revenue_generated > 0;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE student_revenue_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_history_team_all"
  ON student_revenue_history
  FOR ALL
  USING (is_team_member(auth.uid()));

CREATE POLICY "revenue_history_student_select"
  ON student_revenue_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

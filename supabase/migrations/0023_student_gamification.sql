-- ============================================================
-- 0023: Gamificação na Incubadora
-- ============================================================

CREATE TABLE student_points_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  action_type  text        NOT NULL,
  points       int         NOT NULL,
  description  text,
  reference_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_points_log_student ON student_points_log(student_id);
CREATE INDEX idx_student_points_log_created ON student_points_log(student_id, created_at DESC);

CREATE TABLE student_badges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_key  text        NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, badge_key)
);

CREATE INDEX idx_student_badges_student ON student_badges(student_id);

-- View: total de pontos por aluno (herda RLS da tabela base)
CREATE VIEW student_points_total AS
SELECT student_id, COALESCE(SUM(points), 0)::int AS total_points
FROM student_points_log
GROUP BY student_id;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE student_points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges    ENABLE ROW LEVEL SECURITY;

-- Aluno lê os próprios registos; equipa lê todos
CREATE POLICY "spl_select" ON student_points_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_points_log.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

-- INSERT apenas pelo sistema (admin client bypasses RLS)
CREATE POLICY "spl_insert" ON student_points_log
  FOR INSERT WITH CHECK (is_team_member(auth.uid()));

-- Idem para badges
CREATE POLICY "sb_select" ON student_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_badges.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "sb_insert" ON student_badges
  FOR INSERT WITH CHECK (is_team_member(auth.uid()));

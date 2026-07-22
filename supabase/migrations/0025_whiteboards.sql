-- ============================================================
-- 0025: Whiteboard Global
-- ============================================================

CREATE TABLE whiteboards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  data        jsonb       NOT NULL DEFAULT '{}',
  created_by  uuid        REFERENCES team_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whiteboards_updated_at_idx ON whiteboards (updated_at DESC);

CREATE TRIGGER whiteboards_updated_at
  BEFORE UPDATE ON whiteboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE whiteboards ENABLE ROW LEVEL SECURITY;

-- Team members vêem todos os whiteboards
CREATE POLICY "team members lêem whiteboards"
  ON whiteboards FOR SELECT
  USING (is_team_member(auth.uid()));

-- Team members criam whiteboards
CREATE POLICY "team members criam whiteboards"
  ON whiteboards FOR INSERT
  WITH CHECK (is_team_member(auth.uid()));

-- Team members actualizam whiteboards (auto-save)
CREATE POLICY "team members actualizam whiteboards"
  ON whiteboards FOR UPDATE
  USING (is_team_member(auth.uid()));

-- Só admins eliminam whiteboards
CREATE POLICY "admins eliminam whiteboards"
  ON whiteboards FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================
-- 0022: Tracker de Lançamentos por Aluno
-- ============================================================

CREATE TABLE student_launches (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  type              text,
  status            text        NOT NULL DEFAULT 'planeamento',
  launch_date       date,
  product_name      text,
  product_ticket    text,
  leads_goal        numeric,
  revenue_goal      numeric,
  investment_budget numeric,
  -- Debriefing pós-lançamento
  leads_captured    numeric,
  conversion_rate   numeric,
  revenue_gross     numeric,
  revenue_net       numeric,
  roas              numeric,
  whatsapp_leads    numeric,
  live_peak         numeric,
  reflection        text,
  completed_at      timestamptz,
  -- Controlo: evita duplicação do ROI ao re-guardar
  revenue_synced    boolean     NOT NULL DEFAULT false,
  -- Meta
  created_by        uuid        REFERENCES team_members(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_launches_student ON student_launches(student_id);
CREATE INDEX idx_student_launches_status  ON student_launches(status);

-- Trigger updated_at (reutiliza função do schema inicial)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON student_launches
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- Trigger: sincroniza revenue_net → students.revenue_generated
-- Dispara quando status muda para 'concluido' com revenue_net
-- preenchido, ou quando revenue_net é preenchido pela primeira
-- vez num lançamento já concluído.
-- revenue_synced impede duplicação em re-saves.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_student_launch_sync_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'concluido'
       AND NEW.revenue_net IS NOT NULL
       AND NOT NEW.revenue_synced
    THEN
      UPDATE students
      SET revenue_generated = COALESCE(revenue_generated, 0) + NEW.revenue_net
      WHERE id = NEW.student_id;
      NEW.revenue_synced := true;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Caso 1: status acabou de mudar para 'concluido' com revenue_net
    IF NEW.status = 'concluido'
       AND OLD.status != 'concluido'
       AND NEW.revenue_net IS NOT NULL
       AND NOT NEW.revenue_synced
    THEN
      UPDATE students
      SET revenue_generated = COALESCE(revenue_generated, 0) + NEW.revenue_net
      WHERE id = NEW.student_id;
      NEW.revenue_synced := true;

    -- Caso 2: já concluído, revenue_net preenchido pela primeira vez
    ELSIF NEW.status = 'concluido'
       AND OLD.status = 'concluido'
       AND OLD.revenue_net IS NULL
       AND NEW.revenue_net IS NOT NULL
       AND NOT NEW.revenue_synced
    THEN
      UPDATE students
      SET revenue_generated = COALESCE(revenue_generated, 0) + NEW.revenue_net
      WHERE id = NEW.student_id;
      NEW.revenue_synced := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_launches_revenue_sync
  BEFORE INSERT OR UPDATE ON student_launches
  FOR EACH ROW EXECUTE FUNCTION trg_student_launch_sync_revenue();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE student_launches ENABLE ROW LEVEL SECURITY;

-- Aluno lê os próprios lançamentos; equipa lê todos
CREATE POLICY "student_launches_select" ON student_launches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_launches.student_id
        AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

-- Apenas equipa escreve
CREATE POLICY "student_launches_insert" ON student_launches
  FOR INSERT WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "student_launches_update" ON student_launches
  FOR UPDATE USING (is_team_member(auth.uid()));

CREATE POLICY "student_launches_delete" ON student_launches
  FOR DELETE USING (is_team_member(auth.uid()));

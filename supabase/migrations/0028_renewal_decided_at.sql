-- ============================================================
-- 0028: Timestamp de decisão de renovação
-- Preenchido automaticamente quando renewal_status sai de 'pendente'
-- ============================================================

ALTER TABLE students
  ADD COLUMN renewal_decided_at timestamptz;

CREATE OR REPLACE FUNCTION trg_renewal_decided_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.renewal_status = 'pendente'
     AND NEW.renewal_status != 'pendente'
     AND NEW.renewal_decided_at IS NULL
  THEN
    NEW.renewal_decided_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER students_renewal_decided_at
  BEFORE UPDATE OF renewal_status ON students
  FOR EACH ROW EXECUTE FUNCTION trg_renewal_decided_at();

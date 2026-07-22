-- ============================================================
-- 0020: Adiciona mindmap_url ao perfil do aluno
-- ============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS mindmap_url text;

-- ============================================================
-- 0027: URL e data de publicação da página de vendas do aluno
-- ============================================================

ALTER TABLE students
  ADD COLUMN sales_page_url          text,
  ADD COLUMN sales_page_published_at timestamptz;

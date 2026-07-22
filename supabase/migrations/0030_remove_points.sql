-- ============================================================
-- 0030: Remove sistema de pontos
-- Motivo: O sistema de pontos (Aprendiz/Fazedor/Referência
-- baseado em pontos acumulados) foi removido da aplicação.
-- O nível dos alunos passa a ser gerido manualmente pelo coach
-- através do campo students.level (já existente).
--
-- O que é removido:
--   - VIEW  student_points_total  (soma de pontos por aluno)
--   - TABLE student_points_log    (registo de cada acção com pontos)
--     inclui: 2 índices, políticas RLS spl_select + spl_insert
--
-- Não há triggers ou functions Postgres associados a este sistema
-- (a lógica era 100% application-layer).
--
-- O que fica inalterado:
--   - students.level  (campo BD, editado pelo coach — Kanban)
--   - student_badges  já removida em 0029_remove_badges.sql
-- ============================================================

DROP VIEW  IF EXISTS student_points_total;
DROP TABLE IF EXISTS student_points_log;

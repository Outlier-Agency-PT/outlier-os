-- ============================================================
-- 0029: Remove sistema de badges
-- Motivo: As "Conquistas" (grid de badges) foram substituídas
-- pela "Jornada do Aluno" (timeline cronológica real de marcos
-- de negócio). Os badges eram redundantes e menos informativos.
--
-- O que é removido:
--   - Tabela student_badges (badges conquistados por aluno)
--
-- O que fica:
--   - student_points_log  (alimenta o total de pontos e nível)
--   - student_points_total (view/tabela agregada de pontos)
--   Ambos continuam a ser usados para o sistema Aprendiz →
--   Fazedor → Referência baseado em pontos acumulados.
-- ============================================================

DROP TABLE IF EXISTS student_badges;

-- ============================================================
-- 0036: Remove desafio "Criar Briefing do Negócio"
--
-- O briefing do negócio passou a ser gerido pelo módulo expandido
-- (BriefingDialog). O desafio antigo com campo de texto livre
-- já não faz sentido e é removido juntamente com os registos
-- de alunos que o tinham como concluído (ON DELETE CASCADE).
-- ============================================================

DELETE FROM challenges
WHERE title = 'Criar Briefing do Negócio';

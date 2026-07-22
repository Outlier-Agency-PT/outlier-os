-- ============================================================
-- 0037: Remove desafio "Estruturar Oferta Principal"
--
-- A estruturação da oferta passou a ser gerida pelo módulo
-- de Produtos (StudentProducts). O desafio antigo já não faz
-- sentido e é removido juntamente com os registos de alunos
-- que o tinham como concluído (ON DELETE CASCADE).
-- ============================================================

DELETE FROM challenges
WHERE title = 'Estruturar Oferta Principal';

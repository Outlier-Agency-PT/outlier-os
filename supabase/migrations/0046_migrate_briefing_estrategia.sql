-- ============================================================
-- 0046: Migra passo Estratégia do briefing para students
-- ============================================================
--
-- Migra meta_faturamento → students.revenue_goal
-- Migra meta_leads      → students.leads_goal
-- só se o campo destino estiver vazio (NULL ou 0).
-- tipo_lancamento e frequencia são descartados.
--
-- Nota: revenue_goal e leads_goal existem em students mas
-- não constam das migration files (adicionados via dashboard).

UPDATE public.students s
SET
  revenue_goal = CASE
    WHEN (s.revenue_goal IS NULL OR s.revenue_goal = 0)
         AND sb.estrategia->>'meta_faturamento' IS NOT NULL
         AND sb.estrategia->>'meta_faturamento' != ''
    THEN (sb.estrategia->>'meta_faturamento')::numeric
    ELSE s.revenue_goal
  END,
  leads_goal = CASE
    WHEN (s.leads_goal IS NULL OR s.leads_goal = 0)
         AND sb.estrategia->>'meta_leads' IS NOT NULL
         AND sb.estrategia->>'meta_leads' != ''
    THEN (sb.estrategia->>'meta_leads')::numeric
    ELSE s.leads_goal
  END
FROM public.student_briefings sb
WHERE sb.student_id = s.id
  AND (
    (sb.estrategia->>'meta_faturamento' IS NOT NULL AND sb.estrategia->>'meta_faturamento' != '')
    OR
    (sb.estrategia->>'meta_leads' IS NOT NULL AND sb.estrategia->>'meta_leads' != '')
  );

-- Limpa o campo estrategia de todos os briefings
UPDATE public.student_briefings SET estrategia = '{}'::jsonb;

-- ============================================================
-- 0045: Migra passo Produto do briefing para student_products
-- ============================================================
--
-- Estratégia: INSERT só para alunos sem nenhum produto no catálogo.
-- Se o aluno já tem produto(s), os dados do briefing são descartados
-- (produto do catálogo é mais recente e intencional).
-- Ver decisão de arquitectura em PR reestruturacao-briefings.

INSERT INTO public.student_products (
  student_id,
  name,
  price,
  product_type,
  description,
  value_ladder_position,
  review_status
)
SELECT
  sb.student_id,
  sb.produto->>'nome_produto',
  (sb.produto->>'preco')::numeric,
  COALESCE(NULLIF(sb.produto->>'tipo_produto', ''), 'outro'),
  NULLIF(sb.produto->>'descricao', ''),
  1,
  'em_preenchimento'
FROM public.student_briefings sb
WHERE sb.produto->>'nome_produto' IS NOT NULL
  AND sb.produto->>'nome_produto' != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.student_products sp
    WHERE sp.student_id = sb.student_id
  );

-- Limpa o campo produto de todos os briefings (dados já migrados ou descartados)
UPDATE public.student_briefings SET produto = '{}'::jsonb;

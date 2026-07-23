-- ============================================================
-- 0044: Migra passo Audiência do briefing para student_audience_profiles
-- ============================================================

-- Para cada briefing com avatar preenchido, cria um perfil em rascunho
-- se o aluno ainda não tiver nenhum perfil não-arquivado.
INSERT INTO public.student_audience_profiles (
  student_id,
  name,
  faixa_etaria,
  genero,
  dores,
  sonhos_objetivos,
  barreiras,
  is_primary,
  is_archived,
  review_status
)
SELECT
  sb.student_id,
  COALESCE(NULLIF(sb.audiencia->>'avatar', ''), 'Perfil migrado do briefing'),
  NULLIF(sb.audiencia->>'faixa_etaria', ''),
  NULLIF(sb.audiencia->>'genero', ''),
  ARRAY(
    SELECT v FROM jsonb_array_elements_text(
      COALESCE(
        CASE WHEN jsonb_typeof(sb.audiencia->'dores') = 'array' THEN sb.audiencia->'dores' END,
        '[]'::jsonb
      )
    ) AS v
  ),
  ARRAY(
    SELECT v FROM jsonb_array_elements_text(
      COALESCE(
        CASE WHEN jsonb_typeof(sb.audiencia->'desejos') = 'array' THEN sb.audiencia->'desejos' END,
        '[]'::jsonb
      )
    ) AS v
  ),
  ARRAY(
    SELECT v FROM jsonb_array_elements_text(
      COALESCE(
        CASE WHEN jsonb_typeof(sb.audiencia->'objecoes_audiencia') = 'array' THEN sb.audiencia->'objecoes_audiencia' END,
        '[]'::jsonb
      )
    ) AS v
  ),
  false,       -- não é primary (o aluno deve rever e promover manualmente)
  false,
  'em_preenchimento'
FROM public.student_briefings sb
WHERE sb.audiencia->>'avatar' IS NOT NULL
  AND sb.audiencia->>'avatar' != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.student_audience_profiles ap
    WHERE ap.student_id = sb.student_id
      AND ap.is_archived = false
  );

-- Limpa o campo audiencia de todos os briefings (dados já migrados)
UPDATE public.student_briefings SET audiencia = '{}'::jsonb;

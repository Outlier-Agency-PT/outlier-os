-- ============================================================
-- 0047: offer_overrides em student_launches
-- ============================================================
--
-- Adiciona coluna offer_overrides para guardar overrides de oferta
-- específicos a este lançamento (parcelamento, vagas, prazo, bónus,
-- condições especiais). Campos omitidos = usar valores base do produto.
-- ticket continua em student_launches.ticket (override do preço base).

ALTER TABLE public.student_launches
  ADD COLUMN IF NOT EXISTS offer_overrides jsonb
    NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(offer_overrides) = 'object');

COMMENT ON COLUMN public.student_launches.offer_overrides IS
  'Overrides da oferta para este lançamento específico.
   Shape: {
     num_prestacoes: number | null,
     vagas_limitadas: boolean,
     num_vagas: number | null,
     prazo_oferta: string | null,
     bonus_campanha: string[],
     condicoes_especiais: string | null
   }
   Campos omitidos = usar valores base do produto (student_products).
   ticket continua em student_launches.ticket (override do preço base).';

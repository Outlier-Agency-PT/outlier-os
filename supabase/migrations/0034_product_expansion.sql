-- ============================================================
-- 0034: Expansão da tabela student_products — Módulo 4 Produtos & Escada de Valor
--
-- DECISÃO DE ARQUITECTURA — snapshot:
--   O campo snapshot vai em student_launches (não em student_products).
--   Razão: um produto pode ser usado em vários lançamentos. Uma única
--   coluna snapshot em student_products seria sobrescrita a cada novo
--   lançamento, tornando ambíguo "de que lançamento é este snapshot?".
--   Em student_launches, cada registo guarda a sua própria cópia
--   point-in-time do produto principal no momento de configuração.
-- ============================================================

ALTER TABLE student_products
  -- Relações sequenciais na escada de valor
  ADD COLUMN IF NOT EXISTS previous_product_id uuid
    REFERENCES student_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_product_id uuid
    REFERENCES student_products(id) ON DELETE SET NULL,

  -- Estrutura do produto: [{titulo, descricao?, componentes: string[]}]
  ADD COLUMN IF NOT EXISTS content_modules jsonb NOT NULL DEFAULT '[]',

  -- Condições de venda: {parcelamento, num_prestacoes?, vagas_limitadas, num_vagas?, duracao?}
  ADD COLUMN IF NOT EXISTS condicoes jsonb NOT NULL DEFAULT '{}',

  -- Relações de escada (IDs de outros produtos)
  ADD COLUMN IF NOT EXISTS upsells  jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS downsells jsonb NOT NULL DEFAULT '[]',

  -- Perfis de audiência associados a este produto (IDs de student_audience_profiles)
  ADD COLUMN IF NOT EXISTS audiencias jsonb NOT NULL DEFAULT '[]',

  -- Links: {pagina?, checkout?, recursos?: string[]}
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '{}',

  ADD COLUMN IF NOT EXISTS estrategia_venda text,
  ADD COLUMN IF NOT EXISTS modo_entrega     text,

  -- Arquivado — NUNCA apagado; mantém histórico e relações em lançamentos passados
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,

  -- Promessa principal do produto (independente da promessa do lançamento)
  ADD COLUMN IF NOT EXISTS promise text,

  -- Estado do produto na perspectiva do aluno (diferente de review_status do coach)
  ADD COLUMN IF NOT EXISTS product_status text NOT NULL DEFAULT 'rascunho'
    CHECK (product_status IN ('rascunho', 'activo', 'inactivo')),

  -- Ordem dentro do mesmo nível da escada de valor (para drag-and-drop)
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Índice para filtragem activos / arquivados
CREATE INDEX IF NOT EXISTS idx_student_products_archived
  ON student_products(student_id, is_archived);

-- ── Snapshot por lançamento ───────────────────────────────────────────────────
-- Cada lançamento guarda uma cópia dos valores do produto principal no
-- momento em que foi configurado. Actualizado ao guardar o planeamento.
ALTER TABLE student_launches
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb;

COMMENT ON COLUMN student_launches.product_snapshot IS
  'Cópia dos valores do produto principal (main_product_id) no momento em que o lançamento foi configurado.';

-- ── Comentários de documentação ───────────────────────────────────────────────
COMMENT ON COLUMN student_products.product_status IS
  'Estado operacional do produto: rascunho (em criação) | activo (em venda) | inactivo (suspenso)';

COMMENT ON COLUMN student_products.is_archived IS
  'Produto arquivado — nunca apagado; mantém histórico e relações em lançamentos passados.';

COMMENT ON COLUMN student_products.sort_order IS
  'Ordem de apresentação dentro do mesmo nível da escada de valor.';

COMMENT ON COLUMN student_products.previous_product_id IS
  'Produto imediatamente anterior na escada de valor deste aluno. Sem restrição de circularidade na BD — detectada e avisada na UI.';

COMMENT ON COLUMN student_products.next_product_id IS
  'Produto imediatamente seguinte na escada de valor deste aluno.';

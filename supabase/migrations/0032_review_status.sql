-- ============================================================
-- 0032: Estrutura global de revisão por secção
--
-- Adiciona review_status + review_notes às tabelas que têm
-- fluxo de revisão coach ↔ aluno:
--   - student_briefings    (módulo Negócio)
--   - student_products     (módulo Produtos)
--   - student_launches     (módulo Config. Lançamento + Metas)
--
-- student_audience_profiles ainda não existe — receberá estes
-- campos directamente no CREATE TABLE da migration 0033.
--
-- Estados (mesma enum em todos):
--   nao_iniciado       Aluno ainda não começou
--   em_preenchimento   Aluno está a trabalhar
--   pronto_revisao     Aluno submeteu para revisão do coach
--   alteracoes_pedidas Coach pediu alterações (ver review_notes)
--   aprovado           Coach aprovou
--   arquivado          Registo arquivado (mantém histórico)
--
-- Convenção goal_1/2/3 documentada via COMMENT ON COLUMN em
-- student_launches (não havia documentação escrita).
-- ============================================================

-- ============================================================
-- student_briefings
-- ============================================================

ALTER TABLE student_briefings
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (review_status IN (
      'nao_iniciado', 'em_preenchimento', 'pronto_revisao',
      'alteracoes_pedidas', 'aprovado', 'arquivado'
    )),
  ADD COLUMN IF NOT EXISTS review_notes text;

COMMENT ON COLUMN student_briefings.review_status IS
  'Estado de revisão do briefing: nao_iniciado | em_preenchimento | pronto_revisao | alteracoes_pedidas | aprovado | arquivado';

COMMENT ON COLUMN student_briefings.review_notes IS
  'Notas do coach quando review_status = alteracoes_pedidas';

-- ============================================================
-- student_products
-- ============================================================

ALTER TABLE student_products
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (review_status IN (
      'nao_iniciado', 'em_preenchimento', 'pronto_revisao',
      'alteracoes_pedidas', 'aprovado', 'arquivado'
    )),
  ADD COLUMN IF NOT EXISTS review_notes text;

COMMENT ON COLUMN student_products.review_status IS
  'Estado de revisão do produto: nao_iniciado | em_preenchimento | pronto_revisao | alteracoes_pedidas | aprovado | arquivado';

COMMENT ON COLUMN student_products.review_notes IS
  'Notas do coach quando review_status = alteracoes_pedidas';

-- ============================================================
-- student_launches
-- ============================================================

ALTER TABLE student_launches
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (review_status IN (
      'nao_iniciado', 'em_preenchimento', 'pronto_revisao',
      'alteracoes_pedidas', 'aprovado', 'arquivado'
    )),
  ADD COLUMN IF NOT EXISTS review_notes text;

COMMENT ON COLUMN student_launches.review_status IS
  'Estado de revisão da configuração/metas do lançamento: nao_iniciado | em_preenchimento | pronto_revisao | alteracoes_pedidas | aprovado | arquivado';

COMMENT ON COLUMN student_launches.review_notes IS
  'Notas do coach quando review_status = alteracoes_pedidas';

-- Convenção dos cenários de metas (não estava documentada):
COMMENT ON COLUMN student_launches.lead_goal_1_paid IS
  'Cenário conservador — leads pagos';
COMMENT ON COLUMN student_launches.lead_goal_2_paid IS
  'Cenário esperado — leads pagos';
COMMENT ON COLUMN student_launches.lead_goal_3_paid IS
  'Cenário ambicioso — leads pagos';
COMMENT ON COLUMN student_launches.lead_goal_1_organic IS
  'Cenário conservador — leads orgânicos';
COMMENT ON COLUMN student_launches.lead_goal_2_organic IS
  'Cenário esperado — leads orgânicos';
COMMENT ON COLUMN student_launches.lead_goal_3_organic IS
  'Cenário ambicioso — leads orgânicos';
COMMENT ON COLUMN student_launches.sales_goal_1_count IS
  'Cenário conservador — nº de vendas';
COMMENT ON COLUMN student_launches.sales_goal_1_revenue IS
  'Cenário conservador — receita esperada';
COMMENT ON COLUMN student_launches.sales_goal_2_count IS
  'Cenário esperado — nº de vendas';
COMMENT ON COLUMN student_launches.sales_goal_2_revenue IS
  'Cenário esperado — receita esperada';
COMMENT ON COLUMN student_launches.sales_goal_3_count IS
  'Cenário ambicioso — nº de vendas';
COMMENT ON COLUMN student_launches.sales_goal_3_revenue IS
  'Cenário ambicioso — receita esperada';
COMMENT ON COLUMN student_launches.sales_break_even_count IS
  'Nº de vendas para cobrir o investimento total (break-even)';
COMMENT ON COLUMN student_launches.sales_break_even_revenue IS
  'Receita mínima para break-even';

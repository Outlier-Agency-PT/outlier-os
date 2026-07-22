-- ============================================================
-- 0031: Expansão do módulo de Lançamentos
--
-- 1. CREATE TABLE student_products
-- 2. ALTER TABLE student_launches
--    - Remove colunas simples de planeamento e debriefing legadas
--    - Renomeia name → title, actualiza status default
--    - Adiciona campos detalhados de planeamento + FKs para produtos
--    - Adiciona deletion_requested_at/by para fluxo de aprovação de exclusão
-- 3. CREATE TABLE student_launch_debriefs (debriefing 1:1)
-- 4. Actualiza triggers de revenue sync
-- 5. Actualiza RLS em student_launches + RLS novas tabelas
--
-- Nota: is_retroactive não existe como campo — usa-se status='concluido'
-- no momento da criação para assinalar lançamentos históricos.
-- ============================================================

-- ============================================================
-- STEP 0: Drop triggers e funções legadas antes de alterar tabelas
-- ============================================================

DROP TRIGGER IF EXISTS student_launches_revenue_sync ON student_launches;
DROP FUNCTION IF EXISTS trg_student_launch_sync_revenue();

-- ============================================================
-- STEP 1: student_products
-- ============================================================

CREATE TABLE student_products (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name                   text        NOT NULL,
  description            text,
  price                  numeric,
  product_type           text,
  value_ladder_position  integer,
  beneficios             jsonb       NOT NULL DEFAULT '[]',
  garantia               text,
  bonus                  jsonb       NOT NULL DEFAULT '[]',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_products_student ON student_products(student_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON student_products
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE student_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_products_select" ON student_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_products.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "student_products_insert" ON student_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_products.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "student_products_update" ON student_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_products.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "student_products_delete" ON student_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_products.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

-- ============================================================
-- STEP 2: Alterar student_launches
-- ============================================================

-- 2a. Remove colunas legadas de planeamento simplificado e debriefing antigo
--     (confirmado pelo utilizador: nenhum dado preenchido nestas colunas)
ALTER TABLE student_launches
  DROP COLUMN IF EXISTS product_name,
  DROP COLUMN IF EXISTS product_ticket,
  DROP COLUMN IF EXISTS leads_goal,
  DROP COLUMN IF EXISTS revenue_goal,
  DROP COLUMN IF EXISTS investment_budget,
  DROP COLUMN IF EXISTS leads_captured,
  DROP COLUMN IF EXISTS conversion_rate,
  DROP COLUMN IF EXISTS revenue_gross,
  DROP COLUMN IF EXISTS revenue_net,
  DROP COLUMN IF EXISTS roas,
  DROP COLUMN IF EXISTS whatsapp_leads,
  DROP COLUMN IF EXISTS live_peak,
  DROP COLUMN IF EXISTS reflection;

-- 2b. Renomeia name → title (spec do utilizador)
ALTER TABLE student_launches RENAME COLUMN name TO title;

-- 2c. Actualiza status default: 'planeamento' → 'planeado'
--     Migra valores existentes para evitar inconsistência
UPDATE student_launches SET status = 'planeado' WHERE status = 'planeamento';
ALTER TABLE student_launches ALTER COLUMN status SET DEFAULT 'planeado';

-- 2d. Adiciona campos de planeamento detalhado + produtos + datas + orçamentos + metas
ALTER TABLE student_launches
  -- Produto e proposta
  ADD COLUMN goal                    text,
  ADD COLUMN notes                   text,
  ADD COLUMN channels                text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN promise                 text,
  ADD COLUMN sub_promise             text,
  ADD COLUMN main_product_id         uuid        REFERENCES student_products(id) ON DELETE SET NULL,
  ADD COLUMN downsell_product_id     uuid        REFERENCES student_products(id) ON DELETE SET NULL,
  ADD COLUMN upsell_product_id       uuid        REFERENCES student_products(id) ON DELETE SET NULL,
  ADD COLUMN ticket                  numeric,
  -- Datas
  ADD COLUMN start_date              date,
  ADD COLUMN end_date                date,
  ADD COLUMN capture_start_date      date,
  ADD COLUMN cart_open_date          date,
  ADD COLUMN cart_close_date         date,
  ADD COLUMN downsell_start_date     date,
  ADD COLUMN downsell_end_date       date,
  -- Orçamentos planeados
  ADD COLUMN budget_distribuicao     numeric,
  ADD COLUMN budget_captacao         numeric,
  ADD COLUMN budget_antecipacao      numeric,
  ADD COLUMN budget_remarketing      numeric,
  -- Metas de leads
  ADD COLUMN lead_goal_1_paid        numeric,
  ADD COLUMN lead_goal_2_paid        numeric,
  ADD COLUMN lead_goal_3_paid        numeric,
  ADD COLUMN lead_goal_1_organic     numeric,
  ADD COLUMN lead_goal_2_organic     numeric,
  ADD COLUMN lead_goal_3_organic     numeric,
  ADD COLUMN conversion_rate_leads   numeric,
  -- Metas de vendas
  ADD COLUMN sales_break_even_count  numeric,
  ADD COLUMN sales_break_even_revenue numeric,
  ADD COLUMN sales_goal_1_count      numeric,
  ADD COLUMN sales_goal_1_revenue    numeric,
  ADD COLUMN sales_goal_2_count      numeric,
  ADD COLUMN sales_goal_2_revenue    numeric,
  ADD COLUMN sales_goal_3_count      numeric,
  ADD COLUMN sales_goal_3_revenue    numeric,
  -- Fluxo de aprovação de exclusão por aluno
  ADD COLUMN deletion_requested_at   timestamptz,
  ADD COLUMN deletion_requested_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2e. Actualiza RLS: alunos passam a poder INSERT e UPDATE (mas não DELETE)
DROP POLICY IF EXISTS "student_launches_insert" ON student_launches;
DROP POLICY IF EXISTS "student_launches_update" ON student_launches;
DROP POLICY IF EXISTS "student_launches_delete" ON student_launches;

CREATE POLICY "student_launches_insert" ON student_launches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_launches.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "student_launches_update" ON student_launches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_launches.student_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

-- DELETE só para equipa; aluno usa o fluxo deletion_requested_at
CREATE POLICY "student_launches_delete" ON student_launches
  FOR DELETE USING (is_team_member(auth.uid()));

-- ============================================================
-- STEP 3: student_launch_debriefs
-- ============================================================

CREATE TABLE student_launch_debriefs (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id                   uuid        NOT NULL UNIQUE REFERENCES student_launches(id) ON DELETE CASCADE,

  -- Investimento real
  investimento_total          numeric     NOT NULL DEFAULT 0,
  investimento_distribuicao   numeric     NOT NULL DEFAULT 0,
  investimento_captacao       numeric     NOT NULL DEFAULT 0,
  investimento_antecipacao    numeric     NOT NULL DEFAULT 0,
  investimento_remarketing    numeric     NOT NULL DEFAULT 0,

  -- Tráfego e leads
  visitantes_pagina           integer,
  leads_totais                integer,
  -- Persistidos porque os inputs absolutos (leads_pagas, leads_organicas) não são guardados
  leads_pagas_pct             numeric,
  leads_organicas_pct         numeric,
  leads_publico_quente        integer,
  leads_publico_frio          integer,
  leads_wpp                   integer,

  -- Ao vivo
  ao_vivo_maximo              integer,
  ao_vivo_estavel             integer,
  ao_vivo_pitch               integer,
  visualizacoes               integer,

  -- Criativos
  melhor_video                text,
  melhor_carrossel            text,
  melhor_estatico             text,
  criativos_anexos            jsonb       NOT NULL DEFAULT '[]',

  -- LPV / Checkout
  views_lpv                   integer,
  views_checkout              integer,

  -- Vendas
  total_vendas                integer,
  vendas_dia_evento           integer,
  vendas_workshop             integer,
  receita_liquida_fase_venda  numeric,

  -- Referências
  referencias_geradas         integer,
  -- Persistido porque o input absoluto não é guardado
  referencias_pagas_pct       numeric,

  -- Downsell
  downsell_vendas             integer,
  downsell_receita_bruta      numeric,
  downsell_receita_liquida    numeric,

  -- Qualitativo
  observacoes                 text,

  -- Meta
  revenue_synced              boolean     NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Fórmulas dos campos calculados (NÃO persistidos, calculados na UI):
--   taxa_conversao_lp          = leads_totais / visitantes_pagina
--   cpl                        = investimento_captacao / leads_totais
--   taxa_conv_lead_wpp         = leads_wpp / leads_totais
--   taxa_comparecimento_total  = ao_vivo_estavel / leads_totais
--   taxa_comparecimento_wpp    = ao_vivo_estavel / leads_wpp
--   taxa_conversao_lpv         = total_vendas / views_lpv
--   taxa_conversao_checkout    = total_vendas / views_checkout
--   taxa_conversao_leads       = total_vendas / leads_totais
--   taxa_conversao_ao_vivo     = total_vendas / ao_vivo_estavel
--   roas                       = receita_liquida_fase_venda / investimento_total
--   receita_liquida_total      = receita_liquida_fase_venda + downsell_receita_liquida
--   receita_bruta_total        = (total_vendas × ticket_do_lancamento) + downsell_receita_bruta
--   roas_total                 = receita_liquida_total / investimento_total

CREATE INDEX idx_student_launch_debriefs_launch ON student_launch_debriefs(launch_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON student_launch_debriefs
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS
ALTER TABLE student_launch_debriefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_launch_debriefs_select" ON student_launch_debriefs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_launches sl
      JOIN students s ON s.id = sl.student_id
      WHERE sl.id = student_launch_debriefs.launch_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "student_launch_debriefs_insert" ON student_launch_debriefs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_launches sl
      JOIN students s ON s.id = sl.student_id
      WHERE sl.id = student_launch_debriefs.launch_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

CREATE POLICY "student_launch_debriefs_update" ON student_launch_debriefs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM student_launches sl
      JOIN students s ON s.id = sl.student_id
      WHERE sl.id = student_launch_debriefs.launch_id AND s.user_id = auth.uid()
    )
    OR is_team_member(auth.uid())
  );

-- DELETE do debrief só por equipa (apagar o lançamento já cascades)
CREATE POLICY "student_launch_debriefs_delete" ON student_launch_debriefs
  FOR DELETE USING (is_team_member(auth.uid()));

-- ============================================================
-- STEP 4: Trigger de sincronização de receita (nova versão)
--
-- Dispara em student_launch_debriefs.
-- receita_liquida_total = receita_liquida_fase_venda + downsell_receita_liquida
-- Actualiza students.revenue_generated e marca student_launches.revenue_synced.
--
-- Também dispara em student_launches quando status muda para 'concluido'
-- e o debrief já existe com receita.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_debrief_sync_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id            uuid;
  v_launch_status         text;
  v_receita_liquida_total numeric;
  v_old_total             numeric;
BEGIN
  SELECT sl.student_id, sl.status
    INTO v_student_id, v_launch_status
    FROM student_launches sl
   WHERE sl.id = NEW.launch_id;

  v_receita_liquida_total :=
    COALESCE(NEW.receita_liquida_fase_venda, 0)
    + COALESCE(NEW.downsell_receita_liquida, 0);

  IF TG_OP = 'INSERT' THEN
    IF v_launch_status = 'concluido'
       AND v_receita_liquida_total > 0
       AND NOT NEW.revenue_synced
    THEN
      UPDATE students
         SET revenue_generated = COALESCE(revenue_generated, 0) + v_receita_liquida_total
       WHERE id = v_student_id;
      UPDATE student_launches SET revenue_synced = true WHERE id = NEW.launch_id;
      NEW.revenue_synced := true;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_total :=
      COALESCE(OLD.receita_liquida_fase_venda, 0)
      + COALESCE(OLD.downsell_receita_liquida, 0);

    IF NOT NEW.revenue_synced
       AND v_launch_status = 'concluido'
       AND v_receita_liquida_total > 0
       AND v_old_total = 0
    THEN
      UPDATE students
         SET revenue_generated = COALESCE(revenue_generated, 0) + v_receita_liquida_total
       WHERE id = v_student_id;
      UPDATE student_launches SET revenue_synced = true WHERE id = NEW.launch_id;
      NEW.revenue_synced := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_launch_debriefs_revenue_sync
  BEFORE INSERT OR UPDATE ON student_launch_debriefs
  FOR EACH ROW EXECUTE FUNCTION trg_debrief_sync_revenue();

-- Trigger no lado do lançamento: quando status muda para 'concluido'
-- e já existe um debrief com receita, sincroniza agora.
CREATE OR REPLACE FUNCTION trg_launch_status_sync_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_receita_liquida_total numeric;
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' AND NOT NEW.revenue_synced THEN
    SELECT COALESCE(receita_liquida_fase_venda, 0) + COALESCE(downsell_receita_liquida, 0)
      INTO v_receita_liquida_total
      FROM student_launch_debriefs
     WHERE launch_id = NEW.id;

    IF v_receita_liquida_total IS NOT NULL AND v_receita_liquida_total > 0 THEN
      UPDATE students
         SET revenue_generated = COALESCE(revenue_generated, 0) + v_receita_liquida_total
       WHERE id = NEW.student_id;
      NEW.revenue_synced := true;

      UPDATE student_launch_debriefs
         SET revenue_synced = true
       WHERE launch_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_launches_status_revenue_sync
  BEFORE UPDATE ON student_launches
  FOR EACH ROW EXECUTE FUNCTION trg_launch_status_sync_revenue();

-- ============================================================
-- 0035: Configuração do Lançamento
--
-- 1. student_launch_audiences — múltiplas audiências por lançamento
-- 2. student_launch_name_ideas — sugestões de nome/promessa com aprovação
-- 3. ALTER student_launches — novos campos do assistente de configuração
--
-- Nota sobre RLS:
--   team_members.id = PK = auth.users(id). Não existe coluna user_id.
--   A política de aluno faz JOIN: student_launch_audiences → student_launches → students.
--   A política de equipa usa is_team_member(auth.uid()) — função definida em 0002.
-- ============================================================

-- ============================================================
-- 1. student_launch_audiences
-- ============================================================

CREATE TABLE student_launch_audiences (
  launch_id           uuid NOT NULL REFERENCES student_launches(id) ON DELETE CASCADE,
  audience_profile_id uuid NOT NULL REFERENCES student_audience_profiles(id) ON DELETE CASCADE,
  is_primary          boolean NOT NULL DEFAULT false,
  PRIMARY KEY (launch_id, audience_profile_id)
);

CREATE INDEX idx_sla_launch ON student_launch_audiences(launch_id);
CREATE INDEX idx_sla_profile ON student_launch_audiences(audience_profile_id);

-- Só pode existir uma audiência primária por lançamento
CREATE UNIQUE INDEX student_launch_audiences_primary_idx
  ON student_launch_audiences(launch_id)
  WHERE is_primary = true;

ALTER TABLE student_launch_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_aluno_own" ON student_launch_audiences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_launches sl
      JOIN students s ON s.id = sl.student_id
      WHERE sl.id = student_launch_audiences.launch_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "sla_equipa_all" ON student_launch_audiences
  FOR ALL USING (is_team_member(auth.uid()));

-- ============================================================
-- 2. student_launch_name_ideas
-- ============================================================

CREATE TABLE student_launch_name_ideas (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id uuid        NOT NULL REFERENCES student_launches(id) ON DELETE CASCADE,
  type      text        NOT NULL CHECK (type IN ('nome', 'promessa')),
  content   text        NOT NULL,
  status    text        NOT NULL DEFAULT 'sugestao'
    CHECK (status IN ('sugestao', 'em_apreciacao', 'aprovado', 'rejeitado')),
  notes     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slni_launch ON student_launch_name_ideas(launch_id);

ALTER TABLE student_launch_name_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slni_aluno_own" ON student_launch_name_ideas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_launches sl
      JOIN students s ON s.id = sl.student_id
      WHERE sl.id = student_launch_name_ideas.launch_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "slni_equipa_all" ON student_launch_name_ideas
  FOR ALL USING (is_team_member(auth.uid()));

-- ============================================================
-- 3. ALTER TABLE student_launches — campos do assistente
-- ============================================================

ALTER TABLE student_launches
  -- Snapshot imutável criado no momento de criação do lançamento
  -- Contém: {nome, preco, nivel, formato} do produto principal
  ADD COLUMN IF NOT EXISTS snapshot_at_creation jsonb,

  -- Evento
  ADD COLUMN IF NOT EXISTS event_name     text,
  ADD COLUMN IF NOT EXISTS event_type     text,
  ADD COLUMN IF NOT EXISTS event_platform text,
  -- Armazenado como text (HH:MM) para simplicidade cross-timezone
  ADD COLUMN IF NOT EXISTS event_time     text,

  -- Posicionamento e proposta
  ADD COLUMN IF NOT EXISTS big_idea        text,
  ADD COLUMN IF NOT EXISTS approved_promise text,
  ADD COLUMN IF NOT EXISTS launch_model    text;

COMMENT ON COLUMN student_launches.snapshot_at_creation IS
  'Snapshot imutável do produto principal no momento de criação do lançamento. Nunca actualizar após criação.';

COMMENT ON COLUMN student_launches.launch_model IS
  'Modelo de lançamento: webinar | semente | desafio | outro';

COMMENT ON TABLE student_launch_audiences IS
  'Audiências associadas a um lançamento. Máximo 1 primária (enforced por unique index).';

COMMENT ON TABLE student_launch_name_ideas IS
  'Sugestões de nome de evento e promessa. Máximo 1 aprovado por tipo por lançamento — enforced na action (não na BD para evitar race conditions com listas pequenas).';

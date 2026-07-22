-- Migration 0033: Biblioteca de perfis de audiência

CREATE TABLE student_audience_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  faixa_etaria text,
  genero text,
  estatuto_social text,
  rendimento text,
  nucleo_familiar text,
  area_profissional text,
  habilitacoes text,
  -- Situação actual
  problemas text[] NOT NULL DEFAULT '{}',
  dores text[] NOT NULL DEFAULT '{}',
  medos text[] NOT NULL DEFAULT '{}',
  frustracoes text[] NOT NULL DEFAULT '{}',
  desafios text[] NOT NULL DEFAULT '{}',
  tentativas_anteriores text[] NOT NULL DEFAULT '{}',
  porque_nao_resolveu text,
  -- Situação desejada
  transformacoes text[] NOT NULL DEFAULT '{}',
  beneficios text[] NOT NULL DEFAULT '{}',
  sonhos_objetivos text[] NOT NULL DEFAULT '{}',
  como_quer_sentir text,
  definicao_sucesso text,
  -- Comportamento
  redes_sociais text[] NOT NULL DEFAULT '{}',
  pessoas_marcas_seguidas jsonb NOT NULL DEFAULT '[]',
  conteudos_consumidos jsonb NOT NULL DEFAULT '[]',
  linguagem text[] NOT NULL DEFAULT '{}',
  fatores_decisao text[] NOT NULL DEFAULT '{}',
  barreiras text[] NOT NULL DEFAULT '{}',
  -- Revisão
  review_status text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (review_status IN (
      'nao_iniciado','em_preenchimento','pronto_revisao',
      'alteracoes_pedidas','aprovado','arquivado'
    )),
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice único: só um perfil primário activo por aluno
CREATE UNIQUE INDEX student_audience_profiles_primary_idx
  ON student_audience_profiles(student_id)
  WHERE is_primary = true AND is_archived = false;

-- RLS
ALTER TABLE student_audience_profiles ENABLE ROW LEVEL SECURITY;

-- Aluno lê/escreve os seus próprios
CREATE POLICY "aluno_own" ON student_audience_profiles
  FOR ALL USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Equipa lê/escreve todos
CREATE POLICY "equipa_all" ON student_audience_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND active = true)
  );

-- Trigger updated_at
CREATE TRIGGER update_student_audience_profiles_updated_at
  BEFORE UPDATE ON student_audience_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

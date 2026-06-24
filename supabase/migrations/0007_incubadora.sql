-- ============================================================
-- Outlier OS — Incubadora
-- ============================================================

-- 1. Módulos do método
CREATE TABLE modules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  order_index integer     NOT NULL,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno lê módulos activos"
  ON modules FOR SELECT
  USING (is_active = true);

CREATE POLICY "admin e funcionario gerem módulos"
  ON modules FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'funcionario')
  );

-- 2. Lições por módulo
CREATE TABLE lessons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   uuid        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  content_url text,
  order_index integer     NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno lê lições"
  ON lessons FOR SELECT
  USING (true);

CREATE POLICY "admin e funcionario gerem lições"
  ON lessons FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'funcionario')
  );

-- 3. Progresso por aluno × módulo
CREATE TABLE student_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id    uuid        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completed_at timestamptz,
  UNIQUE(student_id, module_id)
);

ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno vê e escreve o próprio progresso"
  ON student_progress FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "admin e funcionario vêem todo o progresso"
  ON student_progress FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'funcionario')
  );

-- 4. Conclusões por lição
CREATE TABLE lesson_completions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno vê e escreve as próprias conclusões"
  ON lesson_completions FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "admin e funcionario vêem todas as conclusões"
  ON lesson_completions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'funcionario')
  );

-- 5. Botão de Emergência
CREATE TABLE emergency_calls (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now(),
  resolved_at  timestamptz,
  notes        text
);

ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno vê e cria os próprios pedidos"
  ON emergency_calls FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "admin e funcionario gerem todos os pedidos"
  ON emergency_calls FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'funcionario')
  );

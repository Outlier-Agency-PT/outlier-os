-- ============================================================
-- 0024: Suporte Centralizado
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- ── Tabela principal de tickets ───────────────────────────────────────────────

CREATE TABLE support_tickets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject    text        NOT NULL,
  body       text        NOT NULL,
  status     text        NOT NULL DEFAULT 'aberto',   -- aberto | em_analise | resolvido
  priority   text        NOT NULL DEFAULT 'normal',   -- normal | urgente
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_student ON support_tickets(student_id);
CREATE INDEX idx_support_tickets_status  ON support_tickets(status, created_at DESC);

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Respostas ao ticket ───────────────────────────────────────────────────────

CREATE TABLE support_ticket_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES auth.users(id),
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_replies ON support_ticket_replies(ticket_id, created_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- support_tickets: aluno vê os seus, equipa vê todos
CREATE POLICY "st_select" ON support_tickets
  FOR SELECT USING (
    student_id = auth.uid() OR is_team_member(auth.uid())
  );

-- INSERT: só o próprio aluno cria tickets seus
CREATE POLICY "st_insert" ON support_tickets
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- UPDATE: só a equipa muda status/priority
CREATE POLICY "st_update" ON support_tickets
  FOR UPDATE USING (is_team_member(auth.uid()));

-- support_ticket_replies: SELECT permitido a quem tem acesso ao ticket
CREATE POLICY "str_select" ON support_ticket_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
        AND (st.student_id = auth.uid() OR is_team_member(auth.uid()))
    )
  );

-- INSERT: author deve ser o próprio e ter acesso ao ticket
CREATE POLICY "str_insert" ON support_ticket_replies
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
        AND (st.student_id = auth.uid() OR is_team_member(auth.uid()))
    )
  );

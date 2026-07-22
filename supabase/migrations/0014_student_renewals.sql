-- Adiciona campos de renovação ao perfil do aluno
ALTER TABLE students
  ADD COLUMN renewal_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN renewal_date   date,
  ADD COLUMN renewal_notes  text;

COMMENT ON COLUMN students.renewal_status IS 'pendente | renovado | nao_renovado | bonus';

-- ============================================================
-- 0043: Adiciona departamento ao convite
-- ============================================================

alter table public.invites
  add column if not exists department text;

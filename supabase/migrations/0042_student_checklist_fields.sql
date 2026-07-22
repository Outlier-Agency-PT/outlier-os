-- ============================================================
-- 0042: Expansão da checklist de acompanhamento do aluno
-- ============================================================

alter table public.student_checklist
  add column if not exists has_strategy_session  boolean not null default false,
  add column if not exists has_business_briefing boolean not null default false,
  add column if not exists has_mindmap           boolean not null default false,
  add column if not exists has_instagram         boolean not null default false,
  add column if not exists has_launch_briefing   boolean not null default false,
  add column if not exists has_capture_page      boolean not null default false,
  add column if not exists has_ads_campaign      boolean not null default false,
  add column if not exists has_launch            boolean not null default false,
  add column if not exists has_debrief           boolean not null default false;

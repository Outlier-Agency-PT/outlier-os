-- ============================================================
-- Outlier OS — GIN index on tasks.assignees
-- Accelerates array containment queries using the @> operator
-- ============================================================
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- Run this file directly in the Supabase SQL Editor (not via CLI
-- migration runner), which executes statements outside a transaction.
-- ============================================================

create index concurrently if not exists idx_tasks_assignees_gin
  on tasks
  using gin (assignees);

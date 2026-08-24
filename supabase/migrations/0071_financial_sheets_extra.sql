-- ============================================================
-- Outlier OS — Financial extra sheets (Mapa de Fluxo de Caixa 2026)
-- Google Sheets sync: "Gráfico Despesas_26", "Gráfico PnL",
--   "Objetivo Vs Realizado", "Previsão Comparativamente Ano Anterior"
-- Spreadsheet ID: 1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY
-- ============================================================

-- ============================================================
-- 1. financial_grafico_despesas
-- ============================================================

create table financial_grafico_despesas (
  id           uuid        primary key default gen_random_uuid(),
  categoria    text        not null,
  janeiro      numeric,
  fevereiro    numeric,
  marco        numeric,
  abril        numeric,
  maio         numeric,
  junho        numeric,
  julho        numeric,
  agosto       numeric,
  setembro     numeric,
  outubro      numeric,
  novembro     numeric,
  dezembro     numeric,
  total_anual  numeric,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (categoria)
);

alter table financial_grafico_despesas enable row level security;

create policy "financial_grafico_despesas_select" on financial_grafico_despesas
  for select using (is_admin(auth.uid()));

create policy "financial_grafico_despesas_insert" on financial_grafico_despesas
  for insert with check (is_admin(auth.uid()));

create policy "financial_grafico_despesas_update" on financial_grafico_despesas
  for update using (is_admin(auth.uid()));

create trigger financial_grafico_despesas_updated_at
  before update on financial_grafico_despesas
  for each row execute function trg_set_updated_at();

-- ============================================================
-- 2. financial_grafico_pnl
-- ============================================================

create table financial_grafico_pnl (
  id           uuid        primary key default gen_random_uuid(),
  metrica      text        not null,
  janeiro      numeric,
  fevereiro    numeric,
  marco        numeric,
  abril        numeric,
  maio         numeric,
  junho        numeric,
  julho        numeric,
  agosto       numeric,
  setembro     numeric,
  outubro      numeric,
  novembro     numeric,
  dezembro     numeric,
  total_anual  numeric,
  q1           numeric,
  q2           numeric,
  q3           numeric,
  q4           numeric,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (metrica)
);

alter table financial_grafico_pnl enable row level security;

create policy "financial_grafico_pnl_select" on financial_grafico_pnl
  for select using (is_admin(auth.uid()));

create policy "financial_grafico_pnl_insert" on financial_grafico_pnl
  for insert with check (is_admin(auth.uid()));

create policy "financial_grafico_pnl_update" on financial_grafico_pnl
  for update using (is_admin(auth.uid()));

create trigger financial_grafico_pnl_updated_at
  before update on financial_grafico_pnl
  for each row execute function trg_set_updated_at();

-- ============================================================
-- 3. financial_objetivo_realizado
-- ============================================================

create table financial_objetivo_realizado (
  id           uuid        primary key default gen_random_uuid(),
  metrica      text        not null,
  janeiro      numeric,
  fevereiro    numeric,
  marco        numeric,
  abril        numeric,
  maio         numeric,
  junho        numeric,
  julho        numeric,
  agosto       numeric,
  setembro     numeric,
  outubro      numeric,
  novembro     numeric,
  dezembro     numeric,
  total_anual  numeric,
  q1           numeric,
  q2           numeric,
  q3           numeric,
  q4           numeric,
  s1           numeric,
  s2           numeric,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (metrica)
);

alter table financial_objetivo_realizado enable row level security;

create policy "financial_objetivo_realizado_select" on financial_objetivo_realizado
  for select using (is_admin(auth.uid()));

create policy "financial_objetivo_realizado_insert" on financial_objetivo_realizado
  for insert with check (is_admin(auth.uid()));

create policy "financial_objetivo_realizado_update" on financial_objetivo_realizado
  for update using (is_admin(auth.uid()));

create trigger financial_objetivo_realizado_updated_at
  before update on financial_objetivo_realizado
  for each row execute function trg_set_updated_at();

-- ============================================================
-- 4. financial_previsao_ano_anterior
-- ============================================================

create table financial_previsao_ano_anterior (
  id           uuid        primary key default gen_random_uuid(),
  metrica      text        not null,
  janeiro      numeric,
  fevereiro    numeric,
  marco        numeric,
  abril        numeric,
  maio         numeric,
  junho        numeric,
  julho        numeric,
  agosto       numeric,
  setembro     numeric,
  outubro      numeric,
  novembro     numeric,
  dezembro     numeric,
  total_anual  numeric,
  q1           numeric,
  q2           numeric,
  q3           numeric,
  q4           numeric,
  s1           numeric,
  s2           numeric,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (metrica)
);

alter table financial_previsao_ano_anterior enable row level security;

create policy "financial_previsao_ano_anterior_select" on financial_previsao_ano_anterior
  for select using (is_admin(auth.uid()));

create policy "financial_previsao_ano_anterior_insert" on financial_previsao_ano_anterior
  for insert with check (is_admin(auth.uid()));

create policy "financial_previsao_ano_anterior_update" on financial_previsao_ano_anterior
  for update using (is_admin(auth.uid()));

create trigger financial_previsao_ano_anterior_updated_at
  before update on financial_previsao_ano_anterior
  for each row execute function trg_set_updated_at();

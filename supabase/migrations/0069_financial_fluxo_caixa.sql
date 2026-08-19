-- ============================================================
-- Outlier OS — Financial Fluxo de Caixa (Mapa de Fluxo de Caixa 2026)
-- Google Sheets sync: sheet "Fluxo de Caixa 2026"
-- Spreadsheet ID: 1suV8ty4xcLQ7LAfLQychq4wQBMuIOy8qg_Sma-SCFIY
-- ============================================================

create table financial_fluxo_caixa (
  id           uuid        primary key default gen_random_uuid(),
  row_number   integer     not null,
  group_label  text,
  label        text,
  categoria    text,
  is_subtotal  boolean     not null default false,
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
  unique (row_number)
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table financial_fluxo_caixa enable row level security;

create policy "financial_fluxo_caixa_select" on financial_fluxo_caixa
  for select using (is_admin(auth.uid()));

create policy "financial_fluxo_caixa_insert" on financial_fluxo_caixa
  for insert with check (is_admin(auth.uid()));

create policy "financial_fluxo_caixa_update" on financial_fluxo_caixa
  for update using (is_admin(auth.uid()));

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------

create trigger financial_fluxo_caixa_updated_at
  before update on financial_fluxo_caixa
  for each row execute function trg_set_updated_at();

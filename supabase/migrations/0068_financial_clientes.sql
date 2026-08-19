-- ============================================================
-- Outlier OS — Financial Clientes (Mapa de Clientes 2026)
-- Google Sheets sync: 7 sheets from spreadsheet financeiro
-- ============================================================

-- ------------------------------------------------------------
-- financial_clientes
-- One row per client per sheet (static client metadata)
-- ------------------------------------------------------------

create table financial_clientes (
  id                 uuid primary key default gen_random_uuid(),
  sheet_name         text not null,
  data               date,
  plataforma         text,
  vendedor           text,
  cliente            text not null,
  contrato_enviado   boolean,
  contrato_assinado  boolean,
  link_contrato      text,
  contrato           boolean,
  servico            text,
  contactos          text,
  notas              text,
  total_faturado     numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (sheet_name, cliente)
);

-- ------------------------------------------------------------
-- financial_clientes_pagamentos
-- One row per client per month — billing data from month blocks
-- ------------------------------------------------------------

create table financial_clientes_pagamentos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references financial_clientes(id) on delete cascade,
  mes              text not null,
  ano              integer not null default 2026,
  fatura           boolean,
  data_pagamento   integer,
  valor            numeric,
  pagamento        boolean,
  sdr              boolean,
  closer           boolean,
  created_at       timestamptz not null default now(),
  unique (cliente_id, mes, ano)
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table financial_clientes            enable row level security;
alter table financial_clientes_pagamentos enable row level security;

-- financial_clientes: admins read & write
create policy "financial_clientes_select" on financial_clientes
  for select using (is_admin(auth.uid()));

create policy "financial_clientes_insert" on financial_clientes
  for insert with check (is_admin(auth.uid()));

create policy "financial_clientes_update" on financial_clientes
  for update using (is_admin(auth.uid()));

-- financial_clientes_pagamentos: admins read & write
create policy "financial_clientes_pagamentos_select" on financial_clientes_pagamentos
  for select using (is_admin(auth.uid()));

create policy "financial_clientes_pagamentos_insert" on financial_clientes_pagamentos
  for insert with check (is_admin(auth.uid()));

create policy "financial_clientes_pagamentos_update" on financial_clientes_pagamentos
  for update using (is_admin(auth.uid()));

-- ------------------------------------------------------------
-- updated_at trigger (financial_clientes only — pagamentos
-- are append/upsert, no updated_at column)
-- ------------------------------------------------------------

create trigger financial_clientes_updated_at
  before update on financial_clientes
  for each row execute function trg_set_updated_at();

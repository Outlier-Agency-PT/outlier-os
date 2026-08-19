-- ============================================================
-- Outlier OS — Financial Pagamentos (Mapa de Pagamentos 2026)
-- Google Sheets sync: one sheet per month (Jan 26, Fev 26, …)
-- Spreadsheet ID: 1gCbSbIyp8n7pRLlebjRYPELCl2DjhcI-1ux6a_VzR30
-- ============================================================

create table financial_pagamentos (
  id                   uuid        primary key default gen_random_uuid(),
  mes                  text        not null,
  ano                  integer     not null default 2026,
  secao                text        not null,
  nome                 text        not null,
  valor                numeric,
  iban_referencia      text,
  agendamento          boolean,
  aceite_daniel        boolean,
  pagamento_efetuada_a text,
  numero_fatura        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (mes, secao, nome)
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table financial_pagamentos enable row level security;

create policy "financial_pagamentos_select" on financial_pagamentos
  for select using (is_admin(auth.uid()));

create policy "financial_pagamentos_insert" on financial_pagamentos
  for insert with check (is_admin(auth.uid()));

create policy "financial_pagamentos_update" on financial_pagamentos
  for update using (is_admin(auth.uid()));

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------

create trigger financial_pagamentos_updated_at
  before update on financial_pagamentos
  for each row execute function trg_set_updated_at();

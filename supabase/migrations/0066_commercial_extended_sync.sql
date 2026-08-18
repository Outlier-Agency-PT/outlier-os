-- ============================================================
-- Outlier OS — Commercial Extended Sync Tables
-- 5 tables for Google Sheets sync (commercial extended)
-- ============================================================

create table commercial_sales_by_funnel (
  id           uuid primary key default uuid_generate_v4(),
  month_name   text,
  year         int,
  funnel_name  text,
  sale_type    text,
  vendas       int,
  synced_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (month_name, year, funnel_name, sale_type)
);

create table commercial_calls_by_funnel (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  funnel_name          text,
  reunioes_agendadas   int,
  reunioes_realizadas  int,
  vendas               int,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year, funnel_name)
);

create table commercial_monthly_targets (
  id                  uuid primary key default uuid_generate_v4(),
  month_name          text,
  year                int,
  meta_faturamento    numeric,
  meta_conversao      numeric,
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (month_name, year)
);

create table commercial_loss_reasons (
  id         uuid primary key default uuid_generate_v4(),
  month_name text,
  year       int,
  role       text,
  reason     text,
  count      int,
  synced_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role, reason, month_name, year)
);

create table commercial_refunds (
  id                      uuid primary key default uuid_generate_v4(),
  data_fecho              date,
  nome_cliente            text,
  produto                 text,
  valor_com_iva           numeric,
  data_refund             date,
  comissao_original_paga  numeric,
  notas                   text,
  synced_at               timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (data_fecho, nome_cliente, produto)
);

create index idx_commercial_sales_by_funnel_year  on commercial_sales_by_funnel(year, month_name, funnel_name);
create index idx_commercial_calls_by_funnel_year  on commercial_calls_by_funnel(year, month_name);
create index idx_commercial_monthly_targets_year  on commercial_monthly_targets(year, month_name);
create index idx_commercial_loss_reasons_role     on commercial_loss_reasons(role);
create index idx_commercial_refunds_year          on commercial_refunds(data_fecho);

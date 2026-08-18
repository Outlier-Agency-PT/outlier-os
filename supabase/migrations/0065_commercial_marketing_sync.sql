-- ============================================================
-- Outlier OS — Commercial & Marketing Sync Tables
-- 7 tables for Google Sheets sync (commercial + marketing)
-- ============================================================

create table commercial_closer_metrics (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  funnel               text,
  closer_name          text,
  se_agendada          int,
  se_realizada         int,
  se_pitch             int,
  vendas               int,
  reembolsos           int,
  valor_reembolso      numeric,
  valor_vendas         numeric,
  cash_collected       numeric,
  valor_primeira_parcela numeric,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year, funnel, closer_name)
);

create table commercial_sdr_metrics (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  funnel               text,
  sdr_name             text,
  ligacoes_realizadas  int,
  ligacoes_atendidas   int,
  ligacoes_conversa    int,
  agendamentos         int,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year, funnel, sdr_name)
);

create table commercial_bdr_metrics (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  bdr_name             text,
  mensagens_enviadas   int,
  mensagens_recebidas  int,
  ligacoes_realizadas  int,
  ligacoes_atendidas   int,
  ligacoes_conversa    int,
  agendamentos         int,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year, bdr_name)
);

create table commercial_call_tracking (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  chamadas_agendadas   int,
  chamadas_canceladas  int,
  no_show              int,
  reagendamentos       int,
  chamadas_realizadas  int,
  chamadas_pitch       int,
  vendas               int,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year)
);

create table marketing_funnel_monthly (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  funnel               text,
  alcance              int,
  budget               numeric,
  leads                int,
  mql                  int,
  sql_count            int,
  vendas_texto         text,
  visitas_perfil       int,
  seguidores           int,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year, funnel)
);

create table marketing_funnel_weekly (
  id                        uuid primary key default uuid_generate_v4(),
  week_label                text,
  week_start                date,
  week_end                  date,
  year                      int,
  conteudos_alcance         int,
  conteudos_visitas_perfil  int,
  conteudos_seguidores      int,
  conteudos_budget          numeric,
  incubadora_alcance        int,
  incubadora_leads          int,
  incubadora_mql            int,
  incubadora_sql            int,
  incubadora_budget         numeric,
  ebook_alcance             int,
  ebook_leads               int,
  ebook_mql                 int,
  ebook_sql                 int,
  ebook_budget              numeric,
  synced_at                 timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (week_start)
);

create table marketing_roas_monthly (
  id                   uuid primary key default uuid_generate_v4(),
  month_name           text,
  year                 int,
  receita_fechada      numeric,
  fechos               int,
  synced_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (month_name, year)
);

create index idx_commercial_closer_metrics_funnel on commercial_closer_metrics(funnel, year, month_name);
create index idx_commercial_sdr_metrics_funnel     on commercial_sdr_metrics(funnel, year, month_name);
create index idx_commercial_bdr_metrics_year       on commercial_bdr_metrics(year, month_name);
create index idx_commercial_call_tracking_year     on commercial_call_tracking(year, month_name);
create index idx_marketing_funnel_monthly_year     on marketing_funnel_monthly(year, funnel);
create index idx_marketing_funnel_weekly_year      on marketing_funnel_weekly(year, week_start);
create index idx_marketing_roas_monthly_year       on marketing_roas_monthly(year, month_name);

-- ============================================================
-- Outlier OS — RBAC
-- Correr no Supabase SQL Editor
-- ============================================================

-- Enum de roles
create type app_role as enum (
  'admin',
  'funcionario',
  'aluno_incubadora',
  'aluno_mentoria'
);

-- Tabela central de roles
create table user_roles (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       app_role    not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Função de verificação (evita recursão no RLS)
create or replace function has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- RLS
alter table user_roles enable row level security;

create policy "utilizador vê os próprios roles"
  on user_roles for select
  using (auth.uid() = user_id);

create policy "admin gere todos os roles"
  on user_roles for all
  using (has_role(auth.uid(), 'admin'));

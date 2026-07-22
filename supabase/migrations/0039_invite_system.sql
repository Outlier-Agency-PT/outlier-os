-- ============================================
-- 0039_invite_system.sql
-- Sistema de convite fechado
-- ============================================

-- 1. FIX DO TRIGGER
-- Adiciona guard: alunos convidados NÃO criam linha em team_members
create or replace function trg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- NOVO: alunos não são team_members
  if new.raw_user_meta_data->>'role' = 'aluno' then
    return new;
  end if;

  -- Lógica original preservada
  insert into public.team_members (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when not exists (select 1 from public.team_members) then 'admin'::member_role
      else coalesce(
        nullif(new.raw_user_meta_data->>'role', '')::member_role,
        'membro'::member_role
      )
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 2. TABELA invites
create table public.invites (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  role       text        not null check (role in ('admin', 'membro', 'aluno')),
  invited_by uuid        references auth.users(id),
  status     text        not null default 'pending'
               check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

alter table public.invites enable row level security;

-- Impede duplicados pendentes para o mesmo email
create unique index invites_email_pending_uidx
  on public.invites (lower(email))
  where status = 'pending';

-- 3. RLS DA TABELA invites

-- SELECT: cada um vê apenas os convites que enviou
create policy "invites_select_own"
  on public.invites for select
  using (invited_by = auth.uid());

-- INSERT: admin pode convidar qualquer role
create policy "invites_insert_admin"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.role = 'admin'
    )
  );

-- INSERT: membro só pode convidar aluno
create policy "invites_insert_membro"
  on public.invites for insert
  with check (
    role = 'aluno'
    and exists (
      select 1 from public.team_members tm
      where tm.id = auth.uid() and tm.role = 'membro'
    )
  );

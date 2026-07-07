-- ============================================================
-- NOTIFICATIONS — notificações in-app
-- ============================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'task_assigned', 'task_comment', 'task_mentioned'
  title text not null,
  body text,
  link text, -- URL para onde navegar ao clicar
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created on notifications(user_id, created_at desc);
create index idx_notifications_user_unread on notifications(user_id, read);

alter table notifications enable row level security;

-- Utilizador só vê as suas notificações. Não há policy de insert para o
-- role authenticated: a criação de notificações acontece sempre a partir
-- de server actions com o service role (createAdminClient), porque quem
-- cria/edita uma tarefa não é o destinatário da notificação.
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid());

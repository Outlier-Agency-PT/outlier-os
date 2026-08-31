-- ============================================================
-- SUGGESTION_ATTACHMENTS — Ficheiros anexos a sugestões
-- ============================================================

create table suggestion_attachments (
  id uuid primary key default uuid_generate_v4(),
  suggestion_id uuid not null references suggestions(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

create index idx_suggestion_attachments_suggestion on suggestion_attachments(suggestion_id);

alter table suggestion_attachments enable row level security;

create policy "suggestion_attachments_admin_select" on suggestion_attachments
  for select using (
    exists (
      select 1 from team_members
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "suggestion_attachments_member_select" on suggestion_attachments
  for select using (
    exists (
      select 1 from suggestions
      where id = suggestion_id and author_id = auth.uid()
    )
  );

create policy "suggestion_attachments_insert" on suggestion_attachments
  for insert with check (
    exists (
      select 1 from suggestions
      where id = suggestion_id and (
        author_id = auth.uid() or
        exists (
          select 1 from team_members
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

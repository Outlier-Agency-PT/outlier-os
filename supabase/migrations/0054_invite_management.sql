-- ============================================================
-- 0054: Políticas de gestão de convites para admins
-- ============================================================

-- DELETE: admins podem cancelar convites pendentes
create policy "invites_delete_admin"
  on public.invites for delete
  to authenticated
  using (
    exists (
      select 1 from public.team_members
      where id = auth.uid()
        and role = 'admin'
        and active = true
    )
  );

-- UPDATE: admins podem actualizar status (expirar, etc.)
create policy "invites_update_admin"
  on public.invites for update
  to authenticated
  using (
    exists (
      select 1 from public.team_members
      where id = auth.uid()
        and role = 'admin'
        and active = true
    )
  );

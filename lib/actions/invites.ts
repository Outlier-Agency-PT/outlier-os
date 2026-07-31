'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Invite, InviteStatus } from '@/lib/types'

export type InviteRole = 'admin' | 'membro' | 'aluno'

export async function createInviteAction(
  email: string,
  role: InviteRole,
  department: string | null = null
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado.' }

  // Validação explícita no servidor
  const { data: tm } = await supabase
    .from('team_members')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!tm || (tm.role !== 'admin' && tm.role !== 'membro')) {
    return { error: 'Sem permissão para enviar convites.' }
  }
  if (tm.role === 'membro' && role !== 'aluno') {
    return { error: 'Membros da equipa só podem convidar alunos.' }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const admin = createAdminClient()

  // Verificar duplicado pendente (via admin para bypassing RLS de SELECT)
  const { data: dup } = await admin
    .from('invites')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (dup) {
    return { error: 'Já existe um convite pendente para este email.' }
  }

  // INSERT passa pela RLS (client do user autenticado)
  const { data: inserted, error: insertError } = await supabase
    .from('invites')
    .insert({ email: normalizedEmail, role, invited_by: user.id, department })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: 'Já existe um convite pendente para este email.' }
    }
    if (insertError.code === '42501') {
      return { error: 'Sem permissão para convidar este tipo de utilizador.' }
    }
    console.error('[createInviteAction] insert error:', insertError)
    return { error: 'Erro ao registar o convite.' }
  }

  // Envio do email de convite
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: { role },
      redirectTo: `${siteUrl}/convite`,
    }
  )

  if (inviteError) {
    // Rollback do registo para não deixar pending órfão
    await admin.from('invites').delete().eq('id', inserted.id)

    if (inviteError.message?.toLowerCase().includes('already')) {
      return { error: 'Este email já tem uma conta registada.' }
    }
    console.error('[createInviteAction] invite error:', inviteError)
    return { error: 'Erro ao enviar o email de convite. Tenta novamente.' }
  }

  return { success: true }
}

export async function acceptInviteAction(
  fullName: string
): Promise<{ success: true; role: InviteRole } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return { error: 'Sessão inválida. Abre novamente o link do convite.' }

  const role = (user.user_metadata?.role ?? '') as InviteRole
  const email = user.email.toLowerCase()
  const admin = createAdminClient()

  // Verificar expiração
  const { data: invite } = await admin
    .from('invites')
    .select('id, expires_at, status, department')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (invite?.expires_at && new Date(invite.expires_at) < new Date()) {
    await admin.from('invites').update({ status: 'expired' }).eq('id', invite.id)
    return { error: 'Este convite expirou. Pede um novo convite.' }
  }

  if (role === 'aluno') {
    const { data: existing } = await admin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      const { error } = await admin.from('students').insert({
        name: fullName || email.split('@')[0],
        email,
        user_id: user.id,
      })
      if (error) {
        console.error('[acceptInviteAction] students insert:', error)
        return { error: 'Erro ao criar o registo de aluno.' }
      }
    }
  } else if (role === 'admin' || role === 'membro') {
    const { data: tm } = await admin
      .from('team_members')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!tm) {
      return { error: 'Registo de equipa não encontrado. Contacta o administrador.' }
    }
    if (tm.role !== role) {
      await admin.from('team_members').update({ role }).eq('id', user.id)
    }
  } else {
    return { error: 'Convite sem tipo de utilizador válido.' }
  }

  if (invite) {
    await admin.from('invites').update({ status: 'accepted' }).eq('id', invite.id)

    if (invite.department && (role === 'admin' || role === 'membro')) {
      await admin.from('team_member_departments').upsert(
        { team_member_id: user.id, department_code: invite.department, is_primary: true },
        { onConflict: 'team_member_id,department_code' }
      )
    }
  }

  return { success: true, role }
}

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Não autenticado.'

  const { data: tm } = await supabase
    .from('team_members')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!tm || tm.role !== 'admin') {
    return 'Sem permissão. Apenas admins podem gerir convites.'
  }

  return null
}

// ---------------------------------------------------------------------------
// listInvitesAction
// ---------------------------------------------------------------------------

export async function listInvitesAction(
  statusFilter: InviteStatus | 'all' = 'all'
): Promise<{ data: Invite[] } | { error: string }> {
  const authError = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createAdminClient()
  let query = admin
    .from('invites')
    .select('id, email, role, invited_by, status, created_at, expires_at, department')
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('[listInvitesAction]', error)
    return { error: 'Erro ao carregar convites.' }
  }

  return { data: data as Invite[] }
}

// ---------------------------------------------------------------------------
// cancelInviteAction
// ---------------------------------------------------------------------------

export async function cancelInviteAction(
  inviteId: string
): Promise<{ success: true } | { error: string }> {
  const authError = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('id, status')
    .eq('id', inviteId)
    .maybeSingle()

  if (!invite) return { error: 'Convite não encontrado.' }
  if (invite.status !== 'pending') return { error: 'Só é possível cancelar convites pendentes.' }

  const { error } = await admin.from('invites').delete().eq('id', inviteId)

  if (error) {
    console.error('[cancelInviteAction]', error)
    return { error: 'Erro ao cancelar o convite.' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// resendInviteAction
// ---------------------------------------------------------------------------

export async function resendInviteAction(
  inviteId: string
): Promise<{ success: true } | { error: string }> {
  const authError = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('id, email, role, status')
    .eq('id', inviteId)
    .maybeSingle()

  if (!invite) return { error: 'Convite não encontrado.' }
  if (invite.status !== 'pending') return { error: 'Só é possível reenviar convites pendentes.' }

  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await admin
    .from('invites')
    .update({ expires_at: newExpiresAt })
    .eq('id', inviteId)

  if (updateError) {
    console.error('[resendInviteAction] update:', updateError)
    return { error: 'Erro ao renovar o convite.' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    invite.email,
    {
      data: { role: invite.role },
      redirectTo: `${siteUrl}/convite`,
    }
  )

  if (inviteError) {
    console.error('[resendInviteAction] invite:', inviteError)
    return { error: 'Erro ao reenviar o email de convite.' }
  }

  return { success: true }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type InviteRole = 'admin' | 'membro' | 'aluno'

export async function createInviteAction(
  email: string,
  role: InviteRole
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
    .insert({ email: normalizedEmail, role, invited_by: user.id })
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
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: { role },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/convite`,
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
    .select('id, expires_at, status')
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
  }

  return { success: true, role }
}

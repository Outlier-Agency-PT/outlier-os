'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { acceptInviteAction, type InviteRole } from '@/lib/actions/invites'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Status = 'verifying' | 'form' | 'submitting' | 'error'

export function ConviteForm({ tokenHash }: { tokenHash: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [role, setRole] = useState<InviteRole | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    async function verify() {
      if (!tokenHash) {
        setErrorMsg('Link de convite inválido ou incompleto.')
        setStatus('error')
        return
      }

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'invite',
      })

      if (error || !data.user) {
        setErrorMsg('Este convite é inválido ou já expirou. Pede um novo convite.')
        setStatus('error')
        return
      }

      const userRole = (data.user.user_metadata?.role ?? null) as InviteRole | null
      setRole(userRole)
      if (userRole === 'aluno' && data.user.email) {
        setName(data.user.email.split('@')[0])
      }
      setStatus('form')
    }
    verify()
  }, [tokenHash])

  async function handleSubmit() {
    setErrorMsg('')

    if (password.length < 8) {
      setErrorMsg('A password deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('As passwords não coincidem.')
      return
    }
    if (role === 'aluno' && !name.trim()) {
      setErrorMsg('Indica o teu nome.')
      return
    }

    setStatus('submitting')

    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setErrorMsg('Erro ao definir a password. Tenta novamente.')
      setStatus('form')
      return
    }

    const result = await acceptInviteAction(name.trim())
    if ('error' in result) {
      setErrorMsg(result.error)
      setStatus('form')
      return
    }

    router.push(result.role === 'aluno' ? '/incubadora' : '/dashboard')
  }

  if (status === 'verifying') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">A validar o convite…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex items-center">
          <img
            src="https://dsfzhrodcxtlayxcfjpx.supabase.co/storage/v1/object/public/assets/logooutliervector.svg?v=2"
            alt="Outlier Agency"
            className="h-16 w-auto"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {role === 'aluno' && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'A criar conta…' : 'Definir password e entrar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

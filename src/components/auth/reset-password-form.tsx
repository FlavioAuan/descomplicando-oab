'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/server/actions/auth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ResetPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await resetPassword(new FormData(e.currentTarget))
      if (result?.error) toast.error(result.error)
    } catch {
      // Redirect handled by server action
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirme a nova senha</Label>
        <Input id="confirm" name="confirm" type="password" placeholder="Repita a senha" required minLength={6} autoComplete="new-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar nova senha
      </Button>
    </form>
  )
}

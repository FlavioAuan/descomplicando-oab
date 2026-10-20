'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/server/actions/auth'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await requestPasswordReset(new FormData(e.currentTarget))
      if ('error' in result) toast.error(result.error)
      else setSentMessage(result.message)
    } catch {
      toast.error('Não foi possível enviar agora. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sentMessage) {
    return (
      <div className="text-center space-y-3">
        <MailCheck className="w-10 h-10 mx-auto" style={{ color: '#C9A227' }} />
        <p className="text-sm text-gray-700">{sentMessage}</p>
        <p className="text-xs text-gray-400">Não chegou? Confira a caixa de spam ou tente de novo em alguns minutos.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="seu@email.com" required autoComplete="email" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Enviar link de redefinição
      </Button>
    </form>
  )
}

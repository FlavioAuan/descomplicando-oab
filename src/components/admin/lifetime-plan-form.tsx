'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Crown, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveLifetimePlan } from '@/server/actions/sales'

export function LifetimePlanForm({ enabled, priceCents }: { enabled: boolean; priceCents: number }) {
  const router = useRouter()
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [price, setPrice] = useState((priceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const result = await saveLifetimePlan({ enabled: isEnabled, price })
    setSaving(false)
    if ('error' in result) return toast.error(result.error)
    toast.success(isEnabled ? 'Plano vitalício liberado para venda' : 'Plano vitalício salvo (fora de venda)')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="w-5 h-5" style={{ color: '#C9A227' }} /> Plano Vitalício
        </CardTitle>
        <p className="text-sm text-gray-500">
          Pagamento único que libera todas as aulas de todos os treinamentos, inclusive os lançados depois.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#C9A227]"
            checked={isEnabled}
            onChange={e => setIsEnabled(e.target.checked)}
          />
          <span>
            <span className="text-sm font-medium text-gray-900">Liberado para venda</span>
            <span className="block text-xs text-gray-500">
              Desmarcado, o plano não aparece para os alunos. Quem já comprou continua com acesso.
            </span>
          </span>
        </label>

        <div className="space-y-2 max-w-xs">
          <Label htmlFor="lifetime-price">Preço (R$)</Label>
          <Input id="lifetime-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveTrainingPrice } from '@/server/actions/sales'

export function TrainingPriceForm({ trainingId, priceCents }: { trainingId: string; priceCents: number | null | undefined }) {
  const router = useRouter()
  const [price, setPrice] = useState(priceCents ? (priceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const result = await saveTrainingPrice({ trainingId, price })
    setSaving(false)
    if ('error' in result) return toast.error(result.error)
    toast.success(result.priceCents ? 'Preço salvo' : 'Treinamento fora de venda avulsa')
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mr-auto">
          <Tag className="w-4 h-4 text-gray-500" />
          <div>
            Venda deste treinamento
            <p className="text-xs font-normal text-gray-500">
              As 2 primeiras aulas (dias 1 e 2) são sempre gratuitas. Em branco = não vendido avulso (só pelo plano vitalício).
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="training-price" className="text-xs">Preço (R$)</Label>
          <Input
            id="training-price"
            inputMode="decimal"
            placeholder="ex.: 297,00"
            className="w-36"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar preço
        </Button>
      </CardContent>
    </Card>
  )
}

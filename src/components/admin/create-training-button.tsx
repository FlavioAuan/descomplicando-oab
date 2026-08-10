'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2 } from 'lucide-react'
import { createTraining } from '@/server/actions/trainings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function CreateTrainingButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
      hoursPerDay: parseFloat((form.elements.namedItem('hoursPerDay') as HTMLInputElement).value),
      daysCount: parseInt((form.elements.namedItem('daysCount') as HTMLInputElement).value),
    }

    const result = await createTraining(data)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Treinamento criado! Gerando com IA...')
      setOpen(false)
      router.push(`/admin/trainings/${result.data?.id}`)
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Treinamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Treinamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Treinamento</Label>
            <Input id="name" name="name" placeholder="Ex: Intensivo OAB 2026/1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Objetivo e público-alvo..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hoursPerDay">Horas por dia</Label>
              <Input
                id="hoursPerDay"
                name="hoursPerDay"
                type="number"
                min="1"
                max="12"
                step="0.5"
                defaultValue="4"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daysCount">Quantidade de dias</Label>
              <Input
                id="daysCount"
                name="daysCount"
                type="number"
                min="7"
                max="365"
                defaultValue="60"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar e Gerar com IA
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

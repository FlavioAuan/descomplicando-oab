'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Clock,
  Trash2,
  Plus,
  Brain,
  Zap,
  BarChart2,
  ListChecks,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Sim = {
  id: string
  name: string
  type: string
  totalQuestions: number
  timeLimitMinutes: number | null
  isAdaptive: boolean | null
  createdAt: Date
  subjectName: string | null
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  general: { label: 'Geral', icon: ClipboardList, color: 'bg-blue-100 text-blue-700' },
  subject: { label: 'Por Disciplina', icon: ListChecks, color: 'bg-purple-100 text-purple-700' },
  topic: { label: 'Por Tópico', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  predicted: { label: 'Previstos', icon: BarChart2, color: 'bg-green-100 text-green-700' },
  adaptive: { label: 'Adaptativo', icon: Brain, color: 'bg-orange-100 text-orange-700' },
}

export function SimulationsList({ simulations }: { simulations: Sim[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o simulado "${name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    try {
      await fetch('/api/admin/simulations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (simulations.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum simulado criado ainda</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Crie seu primeiro simulado para os alunos praticarem
          </p>
          <Button asChild>
            <Link href="/admin/simulations/new">
              <Plus className="w-4 h-4 mr-2" />
              Criar Simulado
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {simulations.map((sim) => {
        const cfg = TYPE_CONFIG[sim.type] ?? TYPE_CONFIG.general
        const Icon = cfg.icon

        return (
          <Card key={sim.id} className="flex flex-col">
            <CardContent className="flex-1 flex flex-col p-5 gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                    {sim.name}
                  </h3>
                  {sim.subjectName && (
                    <p className="text-xs text-gray-500 mt-0.5">{sim.subjectName}</p>
                  )}
                </div>
                <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0', cfg.color)}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  {sim.totalQuestions} questões
                </span>
                {sim.timeLimitMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {sim.timeLimitMinutes} min
                  </span>
                )}
                {sim.isAdaptive && (
                  <Badge variant="secondary" className="text-xs">Adaptativo</Badge>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-auto">
                Criado em{' '}
                {new Date(sim.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </p>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                disabled={deleting === sim.id}
                onClick={() => handleDelete(sim.id, sim.name)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {deleting === sim.id ? 'Excluindo…' : 'Excluir simulado'}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

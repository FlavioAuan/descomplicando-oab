'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Send, CheckCircle, Archive, Loader2 } from 'lucide-react'
import { updateTrainingStatus } from '@/server/actions/trainings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Training, TrainingStatus } from '@/types'

const STATUS_CONFIG: Record<
  TrainingStatus,
  { label: string; next?: TrainingStatus; nextLabel?: string }
> = {
  draft: { label: 'Rascunho', next: 'review', nextLabel: 'Enviar para Revisão' },
  review: { label: 'Em Revisão', next: 'approved', nextLabel: 'Aprovar e Publicar' },
  approved: { label: 'Aprovado', next: 'archived', nextLabel: 'Arquivar' },
  archived: { label: 'Arquivado' },
}

const STATUS_COLORS: Record<TrainingStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
}

interface TrainingApprovalFlowProps {
  training: Training & { days?: unknown[] }
}

export function TrainingApprovalFlow({ training }: TrainingApprovalFlowProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const config = STATUS_CONFIG[training.status]

  async function advance() {
    if (!config.next) return
    setLoading(true)

    const result = await updateTrainingStatus(training.id, config.next)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        config.next === 'approved'
          ? 'Treinamento aprovado e publicado!'
          : config.next === 'review'
          ? 'Enviado para revisão'
          : 'Status atualizado'
      )
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      <Badge className={STATUS_COLORS[training.status]}>
        {config.label}
      </Badge>

      {config.next && (
        <Button onClick={advance} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : config.next === 'approved' ? (
            <CheckCircle className="w-4 h-4 mr-1" />
          ) : config.next === 'review' ? (
            <Send className="w-4 h-4 mr-1" />
          ) : (
            <Archive className="w-4 h-4 mr-1" />
          )}
          {config.nextLabel}
        </Button>
      )}
    </div>
  )
}

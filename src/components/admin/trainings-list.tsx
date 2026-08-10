'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Training } from '@/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Eye, Clock, Calendar, Trash2, Loader2 } from 'lucide-react'
import { deleteTraining } from '@/server/actions/trainings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface TrainingsListProps {
  drafts: Training[]
  inReview: Training[]
  approved: Training[]
  archived: Training[]
}

const STATUS_BADGE = {
  draft:    { label: 'Rascunho',   class: 'bg-gray-100 text-gray-700' },
  review:   { label: 'Em Revisão', class: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado',   class: 'bg-green-100 text-green-700' },
  archived: { label: 'Arquivado',  class: 'bg-red-100 text-red-700' },
}

function DeleteDialog({
  training,
  open,
  onClose,
}: {
  training: Training
  open: boolean
  onClose: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteTraining(training.id)
    if ('error' in result) {
      toast.error('Erro ao excluir treinamento')
    } else {
      toast.success('Treinamento excluído')
      router.refresh()
      onClose()
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir treinamento?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          O treinamento <strong>"{training.name}"</strong> e todos os seus dias e
          atividades serão excluídos permanentemente. Esta ação não pode ser
          desfeita.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TrainingCard({ training }: { training: Training }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const statusBadge = STATUS_BADGE[training.status]

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{training.name}</h3>
            <Badge className={`text-xs ${statusBadge.class}`}>{statusBadge.label}</Badge>
            <span className="text-xs text-gray-400">v{training.currentVersion}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(training.startDate)} – {formatDate(training.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {training.daysCount} dias · {training.hoursPerDay}h/dia
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Link href={`/admin/trainings/${training.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Ver
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <DeleteDialog
        training={training}
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}

function TrainingSection({ trainings }: { trainings: Training[] }) {
  return (
    <div className="space-y-2">
      {trainings.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum treinamento</p>
      ) : (
        trainings.map(t => <TrainingCard key={t.id} training={t} />)
      )}
    </div>
  )
}

export function TrainingsList({ drafts, inReview, approved, archived }: TrainingsListProps) {
  return (
    <Tabs defaultValue="review">
      <TabsList>
        <TabsTrigger value="review">
          Em Revisão {inReview.length > 0 && `(${inReview.length})`}
        </TabsTrigger>
        <TabsTrigger value="draft">
          Rascunhos {drafts.length > 0 && `(${drafts.length})`}
        </TabsTrigger>
        <TabsTrigger value="approved">
          Aprovados {approved.length > 0 && `(${approved.length})`}
        </TabsTrigger>
        <TabsTrigger value="archived">
          Arquivados {archived.length > 0 && `(${archived.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="review" className="mt-4">
        <TrainingSection trainings={inReview} />
      </TabsContent>
      <TabsContent value="draft" className="mt-4">
        <TrainingSection trainings={drafts} />
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        <TrainingSection trainings={approved} />
      </TabsContent>
      <TabsContent value="archived" className="mt-4">
        <TrainingSection trainings={archived} />
      </TabsContent>
    </Tabs>
  )
}

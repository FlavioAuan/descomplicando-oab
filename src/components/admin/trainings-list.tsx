import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Training } from '@/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Eye, Clock, Calendar } from 'lucide-react'

interface TrainingsListProps {
  drafts: Training[]
  inReview: Training[]
  approved: Training[]
  archived: Training[]
}

const STATUS_BADGE = {
  draft: { label: 'Rascunho', class: 'bg-gray-100 text-gray-700' },
  review: { label: 'Em Revisão', class: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado', class: 'bg-green-100 text-green-700' },
  archived: { label: 'Arquivado', class: 'bg-red-100 text-red-700' },
}

function TrainingCard({ training }: { training: Training }) {
  const statusBadge = STATUS_BADGE[training.status]

  return (
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
      <Link href={`/admin/trainings/${training.id}`}>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-1" />
          Ver
        </Button>
      </Link>
    </div>
  )
}

function TrainingSection({
  title,
  trainings,
}: {
  title: string
  trainings: Training[]
}) {
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

export function TrainingsList({
  drafts,
  inReview,
  approved,
  archived,
}: TrainingsListProps) {
  const total = drafts.length + inReview.length + approved.length + archived.length

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
        <TrainingSection title="Em Revisão" trainings={inReview} />
      </TabsContent>
      <TabsContent value="draft" className="mt-4">
        <TrainingSection title="Rascunhos" trainings={drafts} />
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        <TrainingSection title="Aprovados" trainings={approved} />
      </TabsContent>
      <TabsContent value="archived" className="mt-4">
        <TrainingSection title="Arquivados" trainings={archived} />
      </TabsContent>
    </Tabs>
  )
}

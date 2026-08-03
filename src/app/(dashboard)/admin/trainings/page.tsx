import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { trainingsRepository } from '@/server/repositories/trainings'
import { TrainingsList } from '@/components/admin/trainings-list'
import { CreateTrainingButton } from '@/components/admin/create-training-button'

export const metadata: Metadata = { title: 'Treinamentos' }

export default async function AdminTrainingsPage() {
  await requireRole('admin', 'super_admin')

  const [drafts, inReview, approved, archived] = await Promise.all([
    trainingsRepository.listByStatus('draft'),
    trainingsRepository.listByStatus('review'),
    trainingsRepository.listByStatus('approved'),
    trainingsRepository.listByStatus('archived'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treinamentos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie e aprove planos de estudo
          </p>
        </div>
        <CreateTrainingButton />
      </div>

      <TrainingsList
        drafts={drafts}
        inReview={inReview}
        approved={approved}
        archived={archived}
      />
    </div>
  )
}

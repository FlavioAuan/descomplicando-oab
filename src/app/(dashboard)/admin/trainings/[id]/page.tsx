import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { trainingsRepository } from '@/server/repositories/trainings'
import { notFound } from 'next/navigation'
import { TrainingEditor } from '@/components/admin/training-editor'
import { TrainingApprovalFlow } from '@/components/admin/training-approval-flow'

export const metadata: Metadata = { title: 'Editor de Treinamento' }

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin', 'super_admin')
  const { id } = await params

  const training = await trainingsRepository.findWithDays(id)
  if (!training) notFound()

  const versions = await trainingsRepository.getVersions(id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{training.name}</h1>
          <p className="text-gray-500 mt-1">{training.description}</p>
        </div>
        <TrainingApprovalFlow training={training} />
      </div>

      <TrainingEditor training={training} versions={versions} />
    </div>
  )
}

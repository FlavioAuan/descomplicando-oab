import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { trainingsRepository } from '@/server/repositories/trainings'
import { notFound } from 'next/navigation'
import { TrainingEditor } from '@/components/admin/training-editor'
import { TrainingApprovalFlow } from '@/components/admin/training-approval-flow'
import Link from 'next/link'
import { Printer } from 'lucide-react'

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
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href={`/admin/trainings/${id}/print`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir Treinamento
          </Link>
          <TrainingApprovalFlow training={training} />
        </div>
      </div>

      <TrainingEditor training={training} versions={versions} />
    </div>
  )
}

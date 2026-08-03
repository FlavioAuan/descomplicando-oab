import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { calculateSubjectStatistics, getHotTopics } from '@/server/services/statistics'
import { StatisticsView } from '@/components/admin/statistics-view'

export const metadata: Metadata = { title: 'Estatísticas' }

export default async function StatisticsPage() {
  await requireRole('admin', 'super_admin')

  const [subjectStats, hotTopics] = await Promise.all([
    calculateSubjectStatistics(),
    getHotTopics(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estatísticas Históricas</h1>
        <p className="text-gray-500 mt-1">
          Análise completa da distribuição de questões da OAB
        </p>
      </div>

      <StatisticsView stats={subjectStats} hotTopics={hotTopics} />
    </div>
  )
}

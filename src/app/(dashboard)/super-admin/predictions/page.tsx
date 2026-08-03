import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, predictions, subjects, subsubjects } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { PredictionsPanel } from '@/components/super-admin/predictions-panel'

export const metadata: Metadata = { title: 'Previsões OAB' }

export default async function PredictionsPage() {
  await requireRole('super_admin', 'admin')

  const latestPredictions = await db
    .select({
      id: predictions.id,
      rank: predictions.rank,
      probability: predictions.probability,
      frequencyHistorical: predictions.frequencyHistorical,
      frequencyRecent: predictions.frequencyRecent,
      trend: predictions.trend,
      justification: predictions.justification,
      generatedAt: predictions.generatedAt,
      generatedForExam: predictions.generatedForExam,
    })
    .from(predictions)
    .orderBy(desc(predictions.generatedAt), predictions.rank)
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Previsões para a Próxima OAB</h1>
        <p className="text-gray-500 mt-1">
          TOP 50 assuntos mais prováveis baseados em análise histórica e IA
        </p>
      </div>

      <PredictionsPanel predictions={latestPredictions} />
    </div>
  )
}

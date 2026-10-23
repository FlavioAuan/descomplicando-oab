import { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/server/actions/auth'
import { db, studentTrainingProgress, trainings } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { trainingsRepository } from '@/server/repositories/trainings'
import { getAccess, ownsTraining } from '@/server/services/access'
import { getSalesSettings } from '@/server/services/sales-settings'
import { TrainingProgress } from '@/components/student/training-progress'
import { AvailableTrainings } from '@/components/student/available-trainings'
import { Card, CardContent } from '@/components/ui/card'
import { Crown } from 'lucide-react'
import { formatBRL } from '@/lib/money'

export const metadata: Metadata = { title: 'Meu Treinamento' }

export default async function TrainingPage() {
  const user = await requireUser()

  const [myProgress, publishedTrainings, access, sales] = await Promise.all([
    db
      .select({
        id: studentTrainingProgress.id,
        trainingId: studentTrainingProgress.trainingId,
        currentDay: studentTrainingProgress.currentDay,
        completedTopics: studentTrainingProgress.completedTopics,
        startedAt: studentTrainingProgress.startedAt,
        lastAccessedAt: studentTrainingProgress.lastAccessedAt,
        trainingName: trainings.name,
        trainingDays: trainings.daysCount,
        trainingHours: trainings.hoursPerDay,
      })
      .from(studentTrainingProgress)
      .innerJoin(trainings, eq(studentTrainingProgress.trainingId, trainings.id))
      .where(eq(studentTrainingProgress.userId, user.id)),

    trainingsRepository.listPublished(),
    getAccess(user),
    getSalesSettings(),
  ])

  const enrolledIds = new Set(myProgress.map(p => p.trainingId))
  const others = publishedTrainings.filter(t => !enrolledIds.has(t.id))
  const ownedIds = publishedTrainings.filter(t => ownsTraining(access, t.id)).map(t => t.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Treinamento</h1>
        <p className="text-gray-500 mt-1">
          Acompanhe seu cronograma de estudos
        </p>
      </div>

      {sales.lifetimeEnabled && !access.full && (
        <Link href="/student/plans">
          <Card className="border-2 hover:shadow-md transition-shadow" style={{ borderColor: '#C9A227', backgroundColor: '#FFFBEB' }}>
            <CardContent className="p-4 flex items-center gap-3">
              <Crown className="w-6 h-6 flex-shrink-0" style={{ color: '#C9A227' }} />
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Plano Vitalício:</span> todas as aulas de todos os treinamentos por{' '}
                {formatBRL(sales.lifetimePriceCents)}, pagamento único. <span className="text-blue-600 font-medium">Saiba mais →</span>
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {myProgress.length > 0 && (
        <div className="space-y-4">
          {myProgress.map(progress => (
            <TrainingProgress key={progress.id} progress={progress} userId={user.id} />
          ))}
        </div>
      )}

      {(others.length > 0 || myProgress.length === 0) && (
        <AvailableTrainings trainings={others} userId={user.id} ownedIds={ownedIds} />
      )}
    </div>
  )
}

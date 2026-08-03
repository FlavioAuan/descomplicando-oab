import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { db, studentTrainingProgress, trainings, trainingDays, trainingTopics } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { trainingsRepository } from '@/server/repositories/trainings'
import { TrainingProgress } from '@/components/student/training-progress'
import { AvailableTrainings } from '@/components/student/available-trainings'

export const metadata: Metadata = { title: 'Meu Treinamento' }

export default async function TrainingPage() {
  const user = await requireUser()

  const [myProgress, availableTrainings] = await Promise.all([
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
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Treinamento</h1>
        <p className="text-gray-500 mt-1">
          Acompanhe seu cronograma de estudos
        </p>
      </div>

      {myProgress.length > 0 ? (
        <TrainingProgress progress={myProgress[0]} userId={user.id} />
      ) : (
        <AvailableTrainings trainings={availableTrainings} userId={user.id} />
      )}
    </div>
  )
}

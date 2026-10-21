import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, apostilas, studentTrainingProgress, trainingDays, trainingTopics } from '@/lib/db'
import { trainingsRepository } from '../repositories/trainings'

export type StudentTopic = {
  id: string
  order: number
  title: string
  type: string
  estimatedMinutes: number | null
  completed: boolean
  apostilaId: string | null
  exerciseSetId: string | null
  flashcardSetId: string | null
  mindMapId: string | null
}

export type StudentDay = {
  id: string
  dayNumber: number
  date: string | null
  title: string
  description: string | null
  estimatedHours: number | null
  topics: StudentTopic[]
}

/**
 * Training as the student sees it: days, activities with their linked content
 * and what is already completed. Null when it doesn't exist or isn't published
 * (admins can preview drafts).
 */
export async function getStudentTraining(trainingId: string, user: { id: string; role: string }) {
  const training = await trainingsRepository.findWithDays(trainingId)
  if (!training) return null
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  if (training.status !== 'approved' && !isAdmin) return null

  const [progress] = await db
    .select()
    .from(studentTrainingProgress)
    .where(and(eq(studentTrainingProgress.userId, user.id), eq(studentTrainingProgress.trainingId, trainingId)))
    .limit(1)
  const completed = new Set(progress?.completedTopics ?? [])

  const topicIds = training.days.flatMap(d => d.topics.map(t => t.id))
  const apostilaRows = topicIds.length
    ? await db
        .select({ id: apostilas.id, topicId: apostilas.trainingTopicId })
        .from(apostilas)
        .where(inArray(apostilas.trainingTopicId, topicIds))
    : []
  const apostilaByTopic = new Map(apostilaRows.map(a => [a.topicId, a.id]))

  const days: StudentDay[] = training.days.map(day => ({
    id: day.id,
    dayNumber: day.dayNumber,
    date: day.date,
    title: day.title,
    description: day.description,
    estimatedHours: day.estimatedHours,
    topics: day.topics.map(t => {
      const content = (t.content ?? {}) as { exerciseSetId?: string; flashcardSetId?: string; mindMapId?: string }
      return {
        id: t.id,
        order: t.order,
        title: t.title,
        type: t.type,
        estimatedMinutes: t.estimatedMinutes,
        completed: completed.has(t.id),
        apostilaId: apostilaByTopic.get(t.id) ?? null,
        exerciseSetId: content.exerciseSetId ?? null,
        flashcardSetId: content.flashcardSetId ?? null,
        mindMapId: content.mindMapId ?? null,
      }
    }),
  }))

  return {
    training,
    days,
    progress: progress ?? null,
    currentDay: progress?.currentDay ?? 1,
  }
}

/** First day that still has an activity to do (the last day when all are done). */
export async function computeCurrentDay(trainingId: string, completedTopics: string[]) {
  const rows = await db
    .select({ dayNumber: trainingDays.dayNumber, topicId: trainingTopics.id })
    .from(trainingDays)
    .leftJoin(trainingTopics, eq(trainingTopics.trainingDayId, trainingDays.id))
    .where(eq(trainingDays.trainingId, trainingId))
    .orderBy(asc(trainingDays.dayNumber))

  const done = new Set(completedTopics)
  const pending = rows.find(r => r.topicId && !done.has(r.topicId))
  return pending?.dayNumber ?? rows.at(-1)?.dayNumber ?? 1
}

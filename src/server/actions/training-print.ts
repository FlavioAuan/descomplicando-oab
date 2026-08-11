'use server'

import { db } from '@/lib/db'
import { trainings, trainingDays, trainingTopics, apostilas } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { requireRole } from './auth'

export type TopicPrint = {
  id: string
  title: string
  type: string
  order: number
  estimatedMinutes: number | null
  apostilaContent: { title: string; contentHtml: string } | null
}

export type DayPrint = {
  id: string
  dayNumber: number
  title: string
  description: string | null
  estimatedHours: number | null
  topics: TopicPrint[]
}

export type TrainingPrintData = {
  id: string
  name: string
  description: string | null
  daysCount: number
  days: DayPrint[]
}

export async function getTrainingPrintData(trainingId: string): Promise<TrainingPrintData | null> {
  await requireRole('admin', 'super_admin')

  const trainingRows = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1)
  if (!trainingRows[0]) return null
  const training = trainingRows[0]

  const days = await db.select().from(trainingDays)
    .where(eq(trainingDays.trainingId, trainingId))
    .orderBy(asc(trainingDays.dayNumber))

  const daysWithContent: DayPrint[] = await Promise.all(
    days.map(async (day) => {
      const topics = await db.select().from(trainingTopics)
        .where(eq(trainingTopics.trainingDayId, day.id))
        .orderBy(asc(trainingTopics.order))

      const topicsWithContent: TopicPrint[] = await Promise.all(
        topics.map(async (topic) => {
          const apostilaRows = await db
            .select({ title: apostilas.title, contentHtml: apostilas.contentHtml })
            .from(apostilas)
            .where(eq(apostilas.trainingTopicId, topic.id))
            .limit(1)

          return {
            id: topic.id,
            title: topic.title,
            type: topic.type,
            order: topic.order,
            estimatedMinutes: topic.estimatedMinutes,
            apostilaContent: apostilaRows[0] ?? null,
          }
        })
      )

      return {
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description ?? null,
        estimatedHours: day.estimatedHours ?? null,
        topics: topicsWithContent,
      }
    })
  )

  return {
    id: training.id,
    name: training.name,
    description: training.description ?? null,
    daysCount: training.daysCount,
    days: daysWithContent,
  }
}

import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { BaseRepository } from './base'
import {
  trainings,
  trainingDays,
  trainingTopics,
  trainingVersions,
  flashcards,
  simulations,
  apostilas,
} from '@/lib/db/schema'
import type { Training, TrainingStatus } from '@/types'

export class TrainingsRepository extends BaseRepository {
  async findById(id: string): Promise<Training | null> {
    const result = await this.db
      .select()
      .from(trainings)
      .where(eq(trainings.id, id))
      .limit(1)

    return (result[0] as Training) || null
  }

  async findWithDays(id: string) {
    const training = await this.findById(id)
    if (!training) return null

    const days = await this.db
      .select()
      .from(trainingDays)
      .where(eq(trainingDays.trainingId, id))
      .orderBy(asc(trainingDays.dayNumber))

    const daysWithTopics = await Promise.all(
      days.map(async (day) => {
        const topics = await this.db
          .select()
          .from(trainingTopics)
          .where(eq(trainingTopics.trainingDayId, day.id))
          .orderBy(asc(trainingTopics.order))

        return { ...day, topics }
      })
    )

    return { ...training, days: daysWithTopics }
  }

  async listByStatus(status: TrainingStatus): Promise<Training[]> {
    return this.db
      .select()
      .from(trainings)
      .where(eq(trainings.status, status))
      .orderBy(desc(trainings.createdAt)) as Promise<Training[]>
  }

  async listPublished(): Promise<Training[]> {
    return this.db
      .select()
      .from(trainings)
      .where(eq(trainings.status, 'approved'))
      .orderBy(desc(trainings.publishedAt)) as Promise<Training[]>
  }

  async create(data: {
    name: string
    description?: string
    hoursPerDay: number
    daysCount: number
    startDate: string
    endDate: string
    targetExam?: number
    createdBy: string
  }): Promise<Training> {
    const result = await this.db
      .insert(trainings)
      .values({
        name: data.name,
        description: data.description,
        hoursPerDay: data.hoursPerDay,
        daysCount: data.daysCount,
        startDate: data.startDate,
        endDate: data.endDate,
        targetExam: data.targetExam,
        createdBy: data.createdBy,
        status: 'draft',
      })
      .returning()

    return result[0] as Training
  }

  async updateStatus(
    id: string,
    status: TrainingStatus,
    approvedBy?: string
  ): Promise<Training> {
    const updateData: Partial<typeof trainings.$inferInsert> = {
      status,
      updatedAt: new Date(),
    }

    if (status === 'approved') {
      updateData.approvedBy = approvedBy
      updateData.approvedAt = new Date()
      updateData.publishedAt = new Date()
    }

    const result = await this.db
      .update(trainings)
      .set(updateData)
      .where(eq(trainings.id, id))
      .returning()

    return result[0] as Training
  }

  async createVersion(params: {
    trainingId: string
    versionNumber: number
    snapshot: object
    changesDescription: string
    changedBy: string
  }): Promise<void> {
    await this.db.insert(trainingVersions).values({
      trainingId: params.trainingId,
      versionNumber: params.versionNumber,
      snapshot: params.snapshot,
      changesDescription: params.changesDescription,
      changedBy: params.changedBy,
    })

    await this.db
      .update(trainings)
      .set({ currentVersion: params.versionNumber })
      .where(eq(trainings.id, params.trainingId))
  }

  async getVersions(trainingId: string) {
    return this.db
      .select()
      .from(trainingVersions)
      .where(eq(trainingVersions.trainingId, trainingId))
      .orderBy(desc(trainingVersions.versionNumber))
  }

  async insertDaysAndTopics(
    trainingId: string,
    days: Array<{
      dayNumber: number
      title: string
      description?: string
      estimatedHours?: number
      date?: string
      topics: Array<{
        order: number
        title: string
        type: string
        subject?: string
        subtheme?: string
        microtheme?: string
        estimatedMinutes?: number
        subjectId?: string
        subsubjectId?: string
        microtopicId?: string
      }>
    }>
  ): Promise<void> {
    for (const day of days) {
      const [insertedDay] = await this.db
        .insert(trainingDays)
        .values({
          trainingId,
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          estimatedHours: day.estimatedHours,
          date: day.date,
        })
        .returning()

      if (day.topics.length > 0) {
        await this.db.insert(trainingTopics).values(
          day.topics.map((t) => ({
            trainingDayId: insertedDay.id,
            order: t.order,
            title: t.title,
            type: t.type as any,
            subjectId: t.subjectId,
            subsubjectId: t.subsubjectId,
            microtopicId: t.microtopicId,
            estimatedMinutes: t.estimatedMinutes || 30,
          }))
        )
      }
    }
  }

  async delete(id: string): Promise<void> {
    // Days → Topics cascade via clearDays, then delete the training itself
    await this.clearDays(id)
    await this.db.delete(trainings).where(eq(trainings.id, id))
  }

  async clearDays(trainingId: string): Promise<void> {
    // trainingTopics cascade-delete when trainingDay is deleted
    const days = await this.db
      .select({ id: trainingDays.id })
      .from(trainingDays)
      .where(eq(trainingDays.trainingId, trainingId))

    for (const day of days) {
      await this.db.delete(trainingTopics).where(eq(trainingTopics.trainingDayId, day.id))
    }
    await this.db.delete(trainingDays).where(eq(trainingDays.trainingId, trainingId))
  }

  async updateTopic(
    topicId: string,
    data: { title?: string; type?: string; estimatedMinutes?: number }
  ): Promise<void> {
    await this.db
      .update(trainingTopics)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type as any }),
        ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes }),
      })
      .where(eq(trainingTopics.id, topicId))
  }

  async deleteTopic(topicId: string): Promise<void> {
    await this.db.delete(trainingTopics).where(eq(trainingTopics.id, topicId))
  }

  async addTopic(
    dayId: string,
    data: { title: string; type: string; estimatedMinutes: number; order: number }
  ): Promise<void> {
    await this.db.insert(trainingTopics).values({
      trainingDayId: dayId,
      title: data.title,
      type: data.type as any,
      estimatedMinutes: data.estimatedMinutes,
      order: data.order,
    })
  }

  async countAll(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(trainings)

    return result[0]?.count || 0
  }
}

export const trainingsRepository = new TrainingsRepository()

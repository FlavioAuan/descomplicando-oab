'use server'

import { revalidatePath } from 'next/cache'
import { requireRole, requireUser } from './auth'
import { trainingsRepository } from '../repositories/trainings'
import { generateTrainingPlan, generateApostila, generateFlashcards, generateQuestions } from '@/lib/ai/generate'
import { getTopicFrequency, calculateSubjectStatistics } from '../services/statistics'
import { db, subjects, subsubjects, microtopics, apostilas, flashcards, aiGenerations } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Training, TrainingStatus } from '@/types'

const createTrainingSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hoursPerDay: z.number().min(1).max(12),
  daysCount: z.number().min(7).max(365),
  startDate: z.string(),
  endDate: z.string(),
  targetExam: z.number().optional(),
})

export async function createTraining(input: z.infer<typeof createTrainingSchema>) {
  const user = await requireRole('admin', 'super_admin')

  const validated = createTrainingSchema.safeParse(input)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const training = await trainingsRepository.create({
    ...validated.data,
    createdBy: user.id,
  })

  revalidatePath('/admin/trainings')
  return { data: training }
}

export async function generateTrainingWithAI(trainingId: string) {
  const user = await requireRole('admin', 'super_admin')

  const training = await trainingsRepository.findById(trainingId)
  if (!training) return { error: 'Treinamento não encontrado' }

  const startTime = Date.now()

  try {
    const [subjectStats, topicFrequency] = await Promise.all([
      calculateSubjectStatistics(),
      getTopicFrequency(),
    ])

    const topSubjects = subjectStats
      .slice(0, 10)
      .map(s => ({ name: s.subjectName, weight: s.percentageHistorical }))

    const predictions = topicFrequency
      .filter(t => t.trend === 'growing' || t.frequencyHistorical > 0.3)
      .slice(0, 30)
      .map(t => ({
        topic: `${t.subsubjectName} (${t.subjectName})`,
        probability: t.frequencyHistorical,
      }))

    const plan = await generateTrainingPlan({
      name: training.name,
      description: training.description || '',
      hoursPerDay: training.hoursPerDay,
      daysCount: training.daysCount,
      startDate: training.startDate,
      topSubjects,
      predictions,
    })

    // Resolve subject IDs for the generated topics
    const allSubjects = await db.select().from(subjects)
    const allSubsubjects = await db.select().from(subsubjects)
    const subjectMap = new Map(allSubjects.map(s => [s.name.toLowerCase(), s.id]))
    const subsubjectMap = new Map(allSubsubjects.map(s => [s.name.toLowerCase(), s.id]))

    const daysWithIds = plan.days.map(day => ({
      ...day,
      topics: day.topics.map(topic => ({
        ...topic,
        subjectId: subjectMap.get(topic.subject?.toLowerCase() || '') || undefined,
        subsubjectId: subsubjectMap.get(topic.subtheme?.toLowerCase() || '') || undefined,
      })),
    }))

    await trainingsRepository.insertDaysAndTopics(trainingId, daysWithIds)

    // Save AI generation log
    await db.insert(aiGenerations).values({
      type: 'training_plan',
      entityId: trainingId,
      entityType: 'training',
      model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
      durationMs: Date.now() - startTime,
      success: true,
      createdBy: user.id,
    })

    revalidatePath(`/admin/trainings/${trainingId}`)
    return { data: { summary: plan.summary, strategy: plan.studyStrategy } }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await db.insert(aiGenerations).values({
      type: 'training_plan',
      entityId: trainingId,
      entityType: 'training',
      model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
      durationMs: Date.now() - startTime,
      success: false,
      error: errorMessage,
      createdBy: user.id,
    })

    return { error: `Falha ao gerar plano de treinamento: ${errorMessage}` }
  }
}

export async function generateTopicApostila(topicId: string) {
  const user = await requireRole('admin', 'super_admin')

  const [topic] = await db
    .select()
    .from(db.$with('topic').as(
      db.select().from(subjects).limit(1)
    ))
    .limit(1)

  // Get topic details directly
  const { trainingTopics } = await import('@/lib/db/schema')
  const [topicData] = await db
    .select()
    .from(trainingTopics)
    .where(eq(trainingTopics.id, topicId))

  if (!topicData) return { error: 'Tópico não encontrado' }

  const subjectData = topicData.subjectId
    ? await db.select().from(subjects).where(eq(subjects.id, topicData.subjectId)).limit(1)
    : []

  const subsubjectData = topicData.subsubjectId
    ? await db.select().from(subsubjects).where(eq(subsubjects.id, topicData.subsubjectId)).limit(1)
    : []

  const subject = subjectData[0]?.name || topicData.title
  const subtheme = subsubjectData[0]?.name || ''

  const content = await generateApostila({
    subject,
    subtheme,
    microtheme: topicData.title,
  })

  const [savedApostila] = await db
    .insert(apostilas)
    .values({
      trainingTopicId: topicId,
      subjectId: topicData.subjectId,
      subsubjectId: topicData.subsubjectId,
      title: `${subject} - ${subtheme}`,
      contentHtml: content.htmlContent,
    })
    .returning()

  revalidatePath('/admin/trainings')
  return { data: savedApostila }
}

export async function updateTrainingStatus(
  trainingId: string,
  status: TrainingStatus
): Promise<{ data: Training } | { error: string }> {
  try {
    const user = await requireRole('admin', 'super_admin')

    const training = await trainingsRepository.updateStatus(trainingId, status, user.id)

    if (status === 'approved') {
      const fullTraining = await trainingsRepository.findWithDays(trainingId)
      await trainingsRepository.createVersion({
        trainingId,
        versionNumber: training.currentVersion,
        snapshot: fullTraining || {},
        changesDescription: 'Aprovado para publicação',
        changedBy: user.id,
      })
    }

    revalidatePath('/admin/trainings')
    revalidatePath(`/admin/trainings/${trainingId}`)
    return { data: training }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao atualizar status' }
  }
}

export async function getTrainingForStudent(trainingId: string) {
  const user = await requireUser()
  const training = await trainingsRepository.findWithDays(trainingId)

  if (!training || training.status !== 'approved') {
    return { error: 'Treinamento não disponível' }
  }

  return { data: training }
}

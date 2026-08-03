'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './auth'
import { db } from '@/lib/db'
import {
  studentAnswers,
  studentSimulations,
  errorNotebook,
  studentFlashcardProgress,
  studentTrainingProgress,
  certificates,
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { awardXp, updateStreak, checkAndAwardAchievements } from '../services/gamification'
import { calculateNextReview, generateCode } from '@/lib/utils'

export async function submitAnswer(params: {
  questionId: string
  answer: string
  correctAnswer: string
  studentSimulationId?: string
  timeSpentSeconds?: number
}) {
  const user = await requireUser()
  const isCorrect = params.answer.toLowerCase() === params.correctAnswer.toLowerCase()

  // Record the answer
  await db.insert(studentAnswers).values({
    userId: user.id,
    questionId: params.questionId,
    studentSimulationId: params.studentSimulationId,
    answer: params.answer,
    isCorrect,
    timeSpentSeconds: params.timeSpentSeconds,
  })

  if (isCorrect) {
    await awardXp(user.id, 'ANSWER_CORRECT')
  } else {
    // Add to error notebook
    await db
      .insert(errorNotebook)
      .values({
        userId: user.id,
        questionId: params.questionId,
        errorAnswer: params.answer,
        correctAnswer: params.correctAnswer,
        nextReviewAt: calculateNextReview(0, false),
      })
      .onConflictDoNothing()
  }

  return { isCorrect }
}

export async function completeSimulation(studentSimulationId: string) {
  const user = await requireUser()

  const answers = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.studentSimulationId, studentSimulationId))

  const totalAnswered = answers.length
  const totalCorrect = answers.filter(a => a.isCorrect).length
  const percentage = totalAnswered > 0 ? totalCorrect / totalAnswered : 0
  const score = totalCorrect

  await db
    .update(studentSimulations)
    .set({
      completedAt: new Date(),
      totalAnswered,
      totalCorrect,
      score,
      percentage,
    })
    .where(
      and(
        eq(studentSimulations.id, studentSimulationId),
        eq(studentSimulations.userId, user.id)
      )
    )

  // Award XP
  await awardXp(user.id, 'COMPLETE_SIMULATION')
  if (percentage >= 0.9) await awardXp(user.id, 'PERFECT_SIMULATION')

  // Update streak
  const { newStreak, bonusXp } = await updateStreak(user.id)

  // Check achievements
  const totalCorrectAll = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentAnswers)
    .where(and(eq(studentAnswers.userId, user.id), eq(studentAnswers.isCorrect, true)))

  const simsCompleted = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentSimulations)
    .where(
      and(
        eq(studentSimulations.userId, user.id),
        sql`${studentSimulations.completedAt} IS NOT NULL`
      )
    )

  const newAchievements = await checkAndAwardAchievements(user.id, {
    totalCorrect: totalCorrectAll[0]?.count || 0,
    streak: newStreak,
    simulationsCompleted: simsCompleted[0]?.count || 0,
  })

  revalidatePath('/student/simulator')
  return { score, percentage, totalCorrect, totalAnswered, newAchievements, bonusXp }
}

export async function reviewFlashcard(params: {
  flashcardId: string
  correct: boolean
}) {
  const user = await requireUser()

  const existing = await db
    .select()
    .from(studentFlashcardProgress)
    .where(
      and(
        eq(studentFlashcardProgress.userId, user.id),
        eq(studentFlashcardProgress.flashcardId, params.flashcardId)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    const progress = existing[0]
    const newInterval = params.correct
      ? Math.round(progress.interval! * (progress.easeFactor || 2.5))
      : 1

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + newInterval)

    await db
      .update(studentFlashcardProgress)
      .set({
        attempts: (progress.attempts || 0) + 1,
        correct: params.correct ? (progress.correct || 0) + 1 : progress.correct,
        lastReviewed: new Date(),
        nextReview,
        interval: newInterval,
        easeFactor: params.correct
          ? Math.min((progress.easeFactor || 2.5) + 0.1, 3.0)
          : Math.max((progress.easeFactor || 2.5) - 0.2, 1.3),
      })
      .where(eq(studentFlashcardProgress.id, progress.id))
  } else {
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + (params.correct ? 2 : 1))

    await db.insert(studentFlashcardProgress).values({
      userId: user.id,
      flashcardId: params.flashcardId,
      attempts: 1,
      correct: params.correct ? 1 : 0,
      lastReviewed: new Date(),
      nextReview,
    })
  }

  await awardXp(user.id, 'REVIEW_FLASHCARD')
  revalidatePath('/student/flashcards')
}

export async function completeTrainingTopic(params: {
  trainingId: string
  topicId: string
}) {
  const user = await requireUser()

  const existing = await db
    .select()
    .from(studentTrainingProgress)
    .where(
      and(
        eq(studentTrainingProgress.userId, user.id),
        eq(studentTrainingProgress.trainingId, params.trainingId)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    const progress = existing[0]
    const completed = progress.completedTopics || []

    if (!completed.includes(params.topicId)) {
      await db
        .update(studentTrainingProgress)
        .set({
          completedTopics: [...completed, params.topicId],
          lastAccessedAt: new Date(),
        })
        .where(eq(studentTrainingProgress.id, progress.id))

      await awardXp(user.id, 'COMPLETE_TRAINING_DAY')
    }
  } else {
    await db.insert(studentTrainingProgress).values({
      userId: user.id,
      trainingId: params.trainingId,
      currentDay: 1,
      completedTopics: [params.topicId],
      startedAt: new Date(),
      lastAccessedAt: new Date(),
    })

    await awardXp(user.id, 'COMPLETE_TRAINING_DAY')
  }

  revalidatePath('/student/training')
}

export async function issueCertificate(params: {
  trainingId: string
  hoursCompleted: number
  averageScore: number
}): Promise<{ code: string; id: string }> {
  const user = await requireUser()
  const code = generateCode()

  const [cert] = await db
    .insert(certificates)
    .values({
      userId: user.id,
      trainingId: params.trainingId,
      hoursCompleted: params.hoursCompleted,
      averageScore: params.averageScore,
      code,
    })
    .returning()

  await awardXp(user.id, 'COMPLETE_TRAINING')

  revalidatePath('/student/profile')
  return { code, id: cert.id }
}

export async function getStudentDashboard() {
  const user = await requireUser()

  const [answersResult, errorsResult, simsResult] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        correct: sql<number>`sum(case when is_correct then 1 else 0 end)::int`,
      })
      .from(studentAnswers)
      .where(eq(studentAnswers.userId, user.id)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(errorNotebook)
      .where(
        and(
          eq(errorNotebook.userId, user.id),
          sql`${errorNotebook.nextReviewAt} <= NOW()`,
          eq(errorNotebook.mastered, false)
        )
      ),

    db
      .select()
      .from(studentSimulations)
      .where(eq(studentSimulations.userId, user.id))
      .orderBy(studentSimulations.startedAt)
      .limit(5),
  ])

  const stats = answersResult[0] || { total: 0, correct: 0 }
  const accuracy = stats.total > 0 ? (stats.correct || 0) / stats.total : 0

  return {
    user,
    totalAnswered: stats.total,
    totalCorrect: stats.correct || 0,
    accuracy,
    nextReviews: errorsResult[0]?.count || 0,
    recentSimulations: simsResult,
  }
}

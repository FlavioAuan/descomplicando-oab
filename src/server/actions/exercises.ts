'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, exerciseSets, exerciseQuestions, studentExerciseProgress, apostilas } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { generateExerciseSet } from '@/lib/ai/generate'
import { getCurrentUser } from '@/server/actions/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseSetItem = {
  id: string
  title: string
  apostilaTitle: string | null
  questionCount: number
  createdAt: Date
}

export type ExerciseQuestion = {
  id: string
  order: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
  explanation: string | null
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function listExerciseSets(): Promise<ExerciseSetItem[]> {
  await requireRole('admin', 'super_admin')
  const rows = await db
    .select({
      id: exerciseSets.id,
      title: exerciseSets.title,
      apostilaTitle: apostilas.title,
      questionCount: exerciseSets.questionCount,
      createdAt: exerciseSets.createdAt,
    })
    .from(exerciseSets)
    .leftJoin(apostilas, eq(exerciseSets.apostilaId, apostilas.id))
    .orderBy(desc(exerciseSets.createdAt))
  return rows as ExerciseSetItem[]
}

export async function createExerciseSet(formData: FormData): Promise<
  { data: { id: string; title: string; questionCount: number } } | { error: string }
> {
  await requireRole('admin', 'super_admin')

  const title = (formData.get('title') as string)?.trim()
  const apostilaId = (formData.get('apostilaId') as string) || null
  const countRaw = parseInt(formData.get('count') as string) || 10

  if (!title) return { error: 'Título é obrigatório.' }
  if (!apostilaId) return { error: 'Selecione uma apostila como base.' }

  // Fetch apostila content
  const [apostila] = await db.select().from(apostilas).where(eq(apostilas.id, apostilaId)).limit(1)
  if (!apostila) return { error: 'Apostila não encontrada.' }

  // Generate questions with AI
  const questions = await generateExerciseSet({
    title,
    apostilaContent: apostila.contentHtml,
    count: Math.min(countRaw, 20),
  })

  if (!questions.length) return { error: 'A IA não gerou questões. Tente novamente.' }

  // Save set
  const [set] = await db.insert(exerciseSets).values({
    title,
    apostilaId,
    questionCount: questions.length,
  }).returning()

  // Save questions
  await db.insert(exerciseQuestions).values(
    questions.map((q, i) => ({
      setId: set.id,
      order: i + 1,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAnswer: q.correctAnswer.toLowerCase().charAt(0),
      explanation: q.explanation || null,
    }))
  )

  revalidatePath('/admin/exercises')
  return { data: { id: set.id, title: set.title, questionCount: set.questionCount } }
}

export async function deleteExerciseSet(id: string): Promise<{ success: true } | { error: string }> {
  await requireRole('admin', 'super_admin')
  await db.delete(exerciseSets).where(eq(exerciseSets.id, id))
  revalidatePath('/admin/exercises')
  return { success: true }
}

export async function getExerciseSetWithQuestions(id: string): Promise<{
  set: { id: string; title: string }
  questions: ExerciseQuestion[]
} | null> {
  const rows = await db.select().from(exerciseSets).where(eq(exerciseSets.id, id)).limit(1)
  if (!rows[0]) return null

  const questions = await db
    .select()
    .from(exerciseQuestions)
    .where(eq(exerciseQuestions.setId, id))
    .orderBy(exerciseQuestions.order)

  return {
    set: { id: rows[0].id, title: rows[0].title },
    questions: questions as ExerciseQuestion[],
  }
}

// ─── Student Actions ──────────────────────────────────────────────────────────

export async function saveExerciseProgress(
  setId: string,
  answers: Record<string, string>,
  totalCorrect: number,
  totalQuestions: number,
): Promise<{ success: true } | { error: string }> {
  const session = await getCurrentUser()
  if (!session) return { error: 'Não autenticado.' }

  const existing = await db
    .select({ id: studentExerciseProgress.id })
    .from(studentExerciseProgress)
    .where(eq(studentExerciseProgress.userId, session.id))
    .limit(1)

  if (existing.length) {
    await db.update(studentExerciseProgress).set({
      answers,
      totalCorrect,
      totalQuestions,
      completedAt: new Date(),
    }).where(eq(studentExerciseProgress.id, existing[0].id))
  } else {
    await db.insert(studentExerciseProgress).values({
      userId: session.id,
      setId,
      answers,
      totalCorrect,
      totalQuestions,
      completedAt: new Date(),
    })
  }

  return { success: true }
}

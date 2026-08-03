import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { db, flashcards, subjects, studentFlashcardProgress } from '@/lib/db'
import { eq, and, sql, lte, isNull, or } from 'drizzle-orm'
import { FlashcardStudy } from '@/components/student/flashcard-study'

export const metadata: Metadata = { title: 'Flashcards' }

export default async function FlashcardsPage() {
  const user = await requireUser()

  // Get flashcards due for review (spaced repetition)
  const now = new Date()

  const dueCards = await db
    .select({
      id: flashcards.id,
      front: flashcards.front,
      back: flashcards.back,
      difficulty: flashcards.difficulty,
      subject: sql<string>`(SELECT name FROM subjects WHERE id = ${flashcards.subjectId})`,
    })
    .from(flashcards)
    .limit(20)

  const allSubjects = await db
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)

  const stats = await db
    .select({
      total: sql<number>`count(*)::int`,
      mastered: sql<number>`sum(case when correct >= 3 then 1 else 0 end)::int`,
    })
    .from(studentFlashcardProgress)
    .where(eq(studentFlashcardProgress.userId, user.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
        <p className="text-gray-500 mt-1">
          Revise conceitos jurídicos com repetição espaçada
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{dueCards.length}</div>
          <div className="text-sm text-blue-500">Para revisar hoje</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats[0]?.mastered || 0}</div>
          <div className="text-sm text-green-500">Dominados</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-700">{stats[0]?.total || 0}</div>
          <div className="text-sm text-gray-500">Total estudados</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{allSubjects.length}</div>
          <div className="text-sm text-purple-500">Disciplinas</div>
        </div>
      </div>

      <FlashcardStudy cards={dueCards} userId={user.id} />
    </div>
  )
}

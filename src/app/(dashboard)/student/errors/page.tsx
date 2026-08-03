import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { db, errorNotebook, examQuestions, subjects } from '@/lib/db'
import { eq, and, lte, sql } from 'drizzle-orm'
import { ErrorNotebookView } from '@/components/student/error-notebook-view'

export const metadata: Metadata = { title: 'Caderno de Erros' }

export default async function ErrorsPage() {
  const user = await requireUser()

  const now = new Date()

  const dueErrors = await db
    .select({
      id: errorNotebook.id,
      questionId: errorNotebook.questionId,
      errorAnswer: errorNotebook.errorAnswer,
      correctAnswer: errorNotebook.correctAnswer,
      reviewCount: errorNotebook.reviewCount,
      nextReviewAt: errorNotebook.nextReviewAt,
      createdAt: errorNotebook.createdAt,
      statement: examQuestions.statement,
      alternatives: examQuestions.alternatives,
      subjectName: sql<string>`(SELECT name FROM subjects WHERE id = ${examQuestions.subjectId})`,
    })
    .from(errorNotebook)
    .innerJoin(examQuestions, eq(errorNotebook.questionId, examQuestions.id))
    .where(
      and(
        eq(errorNotebook.userId, user.id),
        eq(errorNotebook.mastered, false)
      )
    )
    .orderBy(errorNotebook.nextReviewAt)
    .limit(100)

  const dueNow = dueErrors.filter(e => !e.nextReviewAt || e.nextReviewAt <= now)
  const upcoming = dueErrors.filter(e => e.nextReviewAt && e.nextReviewAt > now)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Caderno de Erros</h1>
        <p className="text-gray-500 mt-1">
          Revise suas questões erradas com revisão espaçada inteligente
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{dueNow.length}</div>
          <div className="text-sm text-red-500">Para revisar agora</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{upcoming.length}</div>
          <div className="text-sm text-orange-500">Próximas revisões</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{dueErrors.length}</div>
          <div className="text-sm text-blue-500">Total pendentes</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {dueErrors.filter(e => e.reviewCount >= 3).length}
          </div>
          <div className="text-sm text-green-500">Quase dominadas</div>
        </div>
      </div>

      <ErrorNotebookView due={dueNow} upcoming={upcoming} />
    </div>
  )
}

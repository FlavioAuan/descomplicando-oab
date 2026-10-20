import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { getStudentTraining } from '@/server/services/student-training'
import { getExerciseSetWithQuestions } from '@/server/actions/exercises'
import { getFlashcardSetWithCards } from '@/server/actions/flashcard-sets'
import { db, apostilas } from '@/lib/db'
import { APOSTILA_CSS } from '@/lib/apostila-css'
import { Card, CardContent } from '@/components/ui/card'
import { ExercisePlayer } from '@/components/student/exercise-player'
import { FlashcardDeck } from '@/components/student/flashcard-deck'
import { CompleteTopicButton } from '@/components/student/complete-topic-button'
import { TOPIC_TYPES } from '@/components/student/training-topic-types'
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export const metadata: Metadata = { title: 'Atividade' }

export default async function TrainingTopicPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>
}) {
  const user = await requireUser()
  const { id, topicId } = await params
  const data = await getStudentTraining(id, user)
  if (!data) notFound()

  const allTopics = data.days.flatMap(d => d.topics.map(t => ({ ...t, day: d })))
  const index = allTopics.findIndex(t => t.id === topicId)
  if (index === -1) notFound()
  const topic = allTopics[index]
  const prev = allTopics[index - 1]
  const next = allTopics[index + 1]

  const [apostila, exercises, flashcards] = await Promise.all([
    topic.apostilaId
      ? db.select().from(apostilas).where(eq(apostilas.id, topic.apostilaId)).limit(1).then(r => r[0] ?? null)
      : null,
    topic.exerciseSetId ? getExerciseSetWithQuestions(topic.exerciseSetId) : null,
    topic.flashcardSetId ? getFlashcardSetWithCards(topic.flashcardSetId) : null,
  ])
  const hasContent = Boolean(apostila || exercises?.questions.length || flashcards?.cards.length)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={`/student/training/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Dia {topic.day.dayNumber} — {topic.day.title}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {TOPIC_TYPES[topic.type]?.icon} {topic.title}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {TOPIC_TYPES[topic.type]?.label ?? topic.type} · {topic.estimatedMinutes ?? 30} min
        </p>
      </div>

      {apostila && (
        <Card>
          <CardContent className="p-6 md:p-8">
            {apostila.pdfUrl && (
              <a
                href={apostila.pdfUrl}
                className="mb-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Download className="w-4 h-4" /> Baixar material original
              </a>
            )}
            <style dangerouslySetInnerHTML={{ __html: APOSTILA_CSS }} />
            <div className="apostila-body" dangerouslySetInnerHTML={{ __html: apostila.contentHtml }} />
          </CardContent>
        </Card>
      )}

      {exercises && exercises.questions.length > 0 && (
        <ExercisePlayer setId={exercises.set.id} title={exercises.set.title} questions={exercises.questions} />
      )}

      {flashcards && flashcards.cards.length > 0 && <FlashcardDeck cards={flashcards.cards} />}

      {!hasContent && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            Esta atividade ainda não tem conteúdo vinculado. Estude o tema indicado no título e marque como concluída.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {prev ? (
          <Link href={`/student/training/${id}/topic/${prev.id}`} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Link>
        ) : <span />}
        <CompleteTopicButton
          trainingId={id}
          topicId={topic.id}
          completed={topic.completed}
          nextHref={next ? `/student/training/${id}/topic/${next.id}` : `/student/training/${id}`}
        />
        {next ? (
          <Link href={`/student/training/${id}/topic/${next.id}`} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            Próxima <ChevronRight className="w-4 h-4" />
          </Link>
        ) : <span />}
      </div>
    </div>
  )
}

import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { getExerciseSetWithQuestions } from '@/server/actions/exercises'
import { ExercisePlayer } from '@/components/student/exercise-player'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Exercícios' }

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ setId: string }>
}) {
  await requireUser()
  const { setId } = await params
  const data = await getExerciseSetWithQuestions(setId)
  if (!data) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{data.set.title}</h1>
        <p className="text-gray-500 mt-1">{data.questions.length} questões</p>
      </div>
      <ExercisePlayer setId={setId} title={data.set.title} questions={data.questions} />
    </div>
  )
}

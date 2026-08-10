import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { listExerciseSets } from '@/server/actions/exercises'
import { listStandaloneApostilas } from '@/server/actions/apostilas'
import { ExercisesPanel } from '@/components/admin/exercises-panel'

export const metadata: Metadata = { title: 'Exercícios' }

export default async function ExercisesPage() {
  await requireRole('admin', 'super_admin')

  const [sets, apostilas] = await Promise.all([
    listExerciseSets(),
    listStandaloneApostilas(),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exercícios</h1>
        <p className="text-gray-500 mt-1">
          Crie conjuntos de exercícios com IA a partir das apostilas criadas.
          Cada conjunto pode ser vinculado a etapas do treinamento dos alunos.
        </p>
      </div>
      <ExercisesPanel initialSets={sets} apostilas={apostilas} />
    </div>
  )
}

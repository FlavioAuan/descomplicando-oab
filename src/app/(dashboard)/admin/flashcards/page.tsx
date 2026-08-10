import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { listFlashcardSets } from '@/server/actions/flashcard-sets'
import { listStandaloneApostilas } from '@/server/actions/apostilas'
import { FlashcardSetsPanel } from '@/components/admin/flashcard-sets-panel'

export const metadata: Metadata = { title: 'Flashcards' }

export default async function AdminFlashcardsPage() {
  await requireRole('admin', 'super_admin')

  const [sets, apostilas] = await Promise.all([
    listFlashcardSets(),
    listStandaloneApostilas(),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
        <p className="text-gray-500 mt-1">
          Crie conjuntos de flashcards com IA a partir das apostilas criadas.
          Os conjuntos podem ser vinculados às etapas do treinamento dos alunos.
        </p>
      </div>
      <FlashcardSetsPanel initialSets={sets} apostilas={apostilas} />
    </div>
  )
}

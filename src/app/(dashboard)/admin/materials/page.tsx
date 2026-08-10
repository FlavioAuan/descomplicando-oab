import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, subjects } from '@/lib/db'
import { listStandaloneApostilas } from '@/server/actions/apostilas'
import { ApostilasPanel } from '@/components/admin/apostilas-panel'

export const metadata: Metadata = { title: 'Apostilas' }

export default async function ApostilasPage() {
  await requireRole('admin', 'super_admin')

  const [apostilas, allSubjects] = await Promise.all([
    listStandaloneApostilas(),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(subjects.name),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apostilas</h1>
        <p className="text-gray-500 mt-1">
          Crie apostilas completas com IA. Informe o título e, opcionalmente,
          faça upload de documentos de referência para enriquecer o conteúdo gerado.
        </p>
      </div>

      <ApostilasPanel initialApostilas={apostilas} subjects={allSubjects} />
    </div>
  )
}

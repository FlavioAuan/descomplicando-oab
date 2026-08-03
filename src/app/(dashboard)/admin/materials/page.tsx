import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, knowledgeFiles, subjects } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { MaterialsManager } from '@/components/admin/materials-manager'

export const metadata: Metadata = { title: 'Materiais e Base Jurídica' }

export default async function MaterialsPage() {
  await requireRole('admin', 'super_admin')

  const [files, allSubjects] = await Promise.all([
    db
      .select()
      .from(knowledgeFiles)
      .where(eq(knowledgeFiles.isActive, true))
      .orderBy(desc(knowledgeFiles.createdAt)),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Base Jurídica e Materiais</h1>
        <p className="text-gray-500 mt-1">
          Faça upload de legislação, apostilas e jurisprudência para indexação RAG
        </p>
      </div>

      <MaterialsManager files={files} subjects={allSubjects} />
    </div>
  )
}

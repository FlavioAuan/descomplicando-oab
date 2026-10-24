import { Metadata } from 'next'
import { and, asc, count, eq } from 'drizzle-orm'
import { requireRole } from '@/server/actions/auth'
import { db, ebooks, orders, subjects, trainings } from '@/lib/db'
import { EbooksManager } from '@/components/admin/ebooks-manager'

export const metadata: Metadata = { title: 'Ebooks' }

export default async function AdminEbooksPage() {
  await requireRole('admin', 'super_admin')

  const [rows, sales, trainingOptions, subjectOptions] = await Promise.all([
    db.select().from(ebooks).orderBy(asc(ebooks.order), asc(ebooks.title)),
    db
      .select({ ebookId: orders.ebookId, sold: count() })
      .from(orders)
      .where(and(eq(orders.kind, 'ebook'), eq(orders.status, 'approved')))
      .groupBy(orders.ebookId),
    db.select({ id: trainings.id, name: trainings.name }).from(trainings).orderBy(asc(trainings.name)),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.name)),
  ])
  const soldBy = new Map(sales.map(s => [s.ebookId, s.sold]))

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ebooks</h1>
        <p className="text-gray-500 mt-1">
          Envie os PDFs, defina o preço e o treinamento vinculado. Quem compra o treinamento vinculado (ou o plano vitalício) recebe o ebook.
        </p>
      </div>

      <EbooksManager
        ebooks={rows.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          subjectId: e.subjectId,
          trainingId: e.trainingId,
          priceCents: e.priceCents,
          coverUrl: e.coverUrl,
          sizeBytes: e.sizeBytes,
          pageCount: e.pageCount,
          order: e.order,
          sold: soldBy.get(e.id) ?? 0,
        }))}
        trainings={trainingOptions}
        subjects={subjectOptions}
      />
    </div>
  )
}

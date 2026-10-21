import { Metadata } from 'next'
import Link from 'next/link'
import { asc, count, eq, min } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, mindMaps, subjects } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Network } from 'lucide-react'

export const metadata: Metadata = { title: 'Mapas Mentais' }

// Maps without a subject are listed under this id (same as in subject/[subjectId]/page.tsx)
const NO_SUBJECT = 'outros'

export default async function MindMapsPage() {
  await requireUser()

  const groups = await db
    .select({
      subjectId: mindMaps.subjectId,
      subjectName: subjects.name,
      total: count(),
      firstOrder: min(mindMaps.order),
    })
    .from(mindMaps)
    .leftJoin(subjects, eq(mindMaps.subjectId, subjects.id))
    .groupBy(mindMaps.subjectId, subjects.name)
    .orderBy(asc(subjects.name))

  // First map of each subject, shown as the card's cover
  const covers = await db
    .select({ subjectId: mindMaps.subjectId, order: mindMaps.order, imageUrl: mindMaps.imageUrl })
    .from(mindMaps)
  const coverOf = (g: (typeof groups)[number]) =>
    covers.find(c => c.subjectId === g.subjectId && c.order === g.firstOrder)?.imageUrl

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapas Mentais</h1>
        <p className="text-gray-500 mt-1">Cada capítulo resumido em uma página para revisar rápido</p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum mapa mental disponível ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map(g => {
            const cover = coverOf(g)
            return (
              <Link key={g.subjectId ?? NO_SUBJECT} href={`/student/mind-maps/subject/${g.subjectId ?? NO_SUBJECT}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardContent className="p-6 flex gap-4">
                    <div
                      className="w-28 h-20 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 border"
                      style={{ backgroundColor: '#111827' }}
                    >
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover object-top" />
                      ) : (
                        <Network className="w-6 h-6" style={{ color: '#C9A227' }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className="font-semibold text-gray-900 group-hover:underline">{g.subjectName ?? 'Outros'}</h2>
                      <p className="text-sm text-gray-600">
                        {g.total} {g.total === 1 ? 'mapa mental' : 'mapas mentais'}
                      </p>
                      <p className="text-sm font-medium text-blue-600">Ver mapas →</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

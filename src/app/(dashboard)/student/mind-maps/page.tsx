import { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, mindMaps, subjects } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Network } from 'lucide-react'

export const metadata: Metadata = { title: 'Mapas Mentais' }

export default async function MindMapsPage() {
  await requireUser()

  const rows = await db
    .select({
      id: mindMaps.id,
      title: mindMaps.title,
      chapter: mindMaps.chapter,
      imageUrl: mindMaps.imageUrl,
      subjectName: subjects.name,
    })
    .from(mindMaps)
    .leftJoin(subjects, eq(mindMaps.subjectId, subjects.id))
    .orderBy(asc(subjects.name), asc(mindMaps.order))

  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = row.subjectName ?? 'Outros'
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapas Mentais</h1>
        <p className="text-gray-500 mt-1">Cada capítulo resumido em uma página para revisar rápido</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum mapa mental disponível ainda</p>
          </CardContent>
        </Card>
      ) : (
        [...groups].map(([subject, maps]) => (
          <section key={subject} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">{subject}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {maps.map(m => (
                <Link key={m.id} href={`/student/mind-maps/${m.id}`} className="group">
                  <Card className="overflow-hidden h-full transition-shadow group-hover:shadow-md">
                    <img src={m.imageUrl} alt="" loading="lazy" className="w-full aspect-[1.41] object-cover object-top border-b" />
                    <CardContent className="p-4">
                      {m.chapter && (
                        <p className="text-xs font-semibold tracking-wide" style={{ color: '#C9A227' }}>CAPÍTULO {m.chapter}</p>
                      )}
                      <p className="font-medium text-gray-900 group-hover:underline">{m.title}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

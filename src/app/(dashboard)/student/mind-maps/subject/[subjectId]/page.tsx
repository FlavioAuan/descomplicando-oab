import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq, isNull } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, mindMaps, subjects } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Mapas Mentais' }

// Maps without a subject are listed under this id (same as in ../../page.tsx)
const NO_SUBJECT = 'outros'

export default async function SubjectMindMapsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  await requireUser()
  const { subjectId } = await params

  const [subject] = subjectId === NO_SUBJECT
    ? [{ name: 'Outros' }]
    : await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, subjectId)).limit(1)
  if (!subject) notFound()

  const maps = await db
    .select({ id: mindMaps.id, title: mindMaps.title, chapter: mindMaps.chapter, imageUrl: mindMaps.imageUrl })
    .from(mindMaps)
    .where(subjectId === NO_SUBJECT ? isNull(mindMaps.subjectId) : eq(mindMaps.subjectId, subjectId))
    .orderBy(asc(mindMaps.order))
  if (maps.length === 0) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student/mind-maps" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Mapas Mentais
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{subject.name}</h1>
        <p className="text-gray-500 mt-1">{maps.length} mapas mentais, um por capítulo</p>
      </div>

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
    </div>
  )
}

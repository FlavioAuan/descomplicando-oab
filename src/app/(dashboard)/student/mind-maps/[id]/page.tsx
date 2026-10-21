import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, mindMaps } from '@/lib/db'
import { MindMapViewer } from '@/components/student/mind-map-viewer'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Mapa mental' }

export default async function MindMapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params

  const [mindMap] = await db.select().from(mindMaps).where(eq(mindMaps.id, id)).limit(1)
  if (!mindMap) notFound()

  // Neighbours within the same subject, for prev/next
  const siblings = mindMap.subjectId
    ? await db
        .select({ id: mindMaps.id, title: mindMaps.title })
        .from(mindMaps)
        .where(eq(mindMaps.subjectId, mindMap.subjectId))
        .orderBy(asc(mindMaps.order))
    : [mindMap]
  const index = siblings.findIndex(s => s.id === mindMap.id)
  const prev = siblings[index - 1]
  const next = siblings[index + 1]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href={`/student/mind-maps/subject/${mindMap.subjectId ?? 'outros'}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Mapas da disciplina
        </Link>
        {mindMap.chapter && (
          <p className="mt-2 text-xs font-semibold tracking-wide" style={{ color: '#C9A227' }}>CAPÍTULO {mindMap.chapter}</p>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{mindMap.title}</h1>
      </div>

      <MindMapViewer mindMap={mindMap} />

      <div className="flex items-center justify-between gap-3 border-t pt-4 text-sm">
        {prev ? (
          <Link href={`/student/mind-maps/${prev.id}`} className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" /> {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/student/mind-maps/${next.id}`} className="inline-flex items-center gap-1 text-right text-gray-600 hover:text-gray-900">
            {next.title} <ChevronRight className="w-4 h-4" />
          </Link>
        ) : <span />}
      </div>
    </div>
  )
}

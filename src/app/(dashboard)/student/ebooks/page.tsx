import { Metadata } from 'next'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, ebooks, subjects } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Download, Library } from 'lucide-react'

export const metadata: Metadata = { title: 'Ebooks' }

function formatSize(bytes: number | null) {
  if (!bytes) return null
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

export default async function EbooksPage() {
  await requireUser()

  const rows = await db
    .select({
      id: ebooks.id,
      title: ebooks.title,
      description: ebooks.description,
      pdfUrl: ebooks.pdfUrl,
      sizeBytes: ebooks.sizeBytes,
      pageCount: ebooks.pageCount,
      subjectName: subjects.name,
    })
    .from(ebooks)
    .leftJoin(subjects, eq(ebooks.subjectId, subjects.id))
    .orderBy(asc(ebooks.order), asc(ebooks.title))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ebooks</h1>
        <p className="text-gray-500 mt-1">Os materiais completos em PDF para ler online ou baixar</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Library className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum ebook disponível ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rows.map(book => {
            const size = formatSize(book.sizeBytes)
            return (
              <Card key={book.id}>
                <CardContent className="p-6 flex gap-4">
                  <div
                    className="w-14 h-20 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#111827' }}
                  >
                    <BookOpen className="w-6 h-6" style={{ color: '#C9A227' }} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {book.subjectName && <p className="text-xs text-gray-500">{book.subjectName}</p>}
                    <h2 className="font-semibold text-gray-900">{book.title}</h2>
                    {book.description && <p className="text-sm text-gray-600">{book.description}</p>}
                    <p className="text-xs text-gray-400">
                      PDF{book.pageCount ? ` · ${book.pageCount} páginas` : ''}{size ? ` · ${size}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-sm">
                      <a
                        href={book.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
                      >
                        <BookOpen className="w-4 h-4" /> Ler online
                      </a>
                      <a href={book.pdfUrl} download className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline">
                        <Download className="w-4 h-4" /> Baixar
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

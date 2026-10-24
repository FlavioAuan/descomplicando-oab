import { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, ebooks, subjects, trainings } from '@/lib/db'
import { getAccess, ownsEbook } from '@/server/services/access'
import { getSalesSettings } from '@/server/services/sales-settings'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BuyButton } from '@/components/student/buy-button'
import { EbookCover } from '@/components/ebook-cover'
import { formatBRL } from '@/lib/money'
import { BookOpen, CheckCircle2, Crown, Download, Library } from 'lucide-react'

export const metadata: Metadata = { title: 'Ebooks' }

export default async function EbooksPage() {
  const user = await requireUser()

  const [rows, access, sales] = await Promise.all([
    db
      .select({
        id: ebooks.id,
        title: ebooks.title,
        description: ebooks.description,
        coverUrl: ebooks.coverUrl,
        priceCents: ebooks.priceCents,
        pageCount: ebooks.pageCount,
        trainingId: ebooks.trainingId,
        trainingName: trainings.name,
        trainingPriceCents: trainings.priceCents,
        trainingStatus: trainings.status,
        subjectName: subjects.name,
      })
      .from(ebooks)
      .leftJoin(subjects, eq(ebooks.subjectId, subjects.id))
      .leftJoin(trainings, eq(ebooks.trainingId, trainings.id))
      .orderBy(asc(ebooks.order), asc(ebooks.title)),
    getAccess(user),
    getSalesSettings(),
  ])

  const items = rows.map(r => ({ ...r, owned: ownsEbook(access, r) }))
  const owned = items.filter(i => i.owned)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ebooks</h1>
        <p className="text-gray-500 mt-1">
          Materiais completos em PDF. Compre cada ebook separadamente ou receba junto com o treinamento correspondente.
        </p>
      </div>

      {sales.lifetimeEnabled && !access.full && items.length > 0 && (
        <Link href="/student/plans">
          <Card className="border-2 hover:shadow-md transition-shadow" style={{ borderColor: '#C9A227', backgroundColor: '#FFFBEB' }}>
            <CardContent className="p-4 flex items-center gap-3">
              <Crown className="w-6 h-6 flex-shrink-0" style={{ color: '#C9A227' }} />
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Plano Vitalício:</span> todos os ebooks e todas as aulas por{' '}
                {formatBRL(sales.lifetimePriceCents)}, pagamento único. <span className="text-blue-600 font-medium">Saiba mais →</span>
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Library className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum ebook disponível ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(book => {
            // The linked training is only an offer if it is published and for sale
            const trainingOffer = book.trainingId && book.trainingStatus === 'approved' && book.trainingPriceCents
            return (
              <Card key={book.id} id={`ebook-${book.id}`} className="flex flex-col overflow-hidden scroll-mt-24 target:ring-2 target:ring-amber-400">
                <div className="bg-gray-100 px-10 pt-6 pb-4">
                  <EbookCover title={book.title} coverUrl={book.coverUrl} className="w-full max-w-[200px] mx-auto shadow-lg" />
                </div>
                <CardContent className="p-5 flex-1 flex flex-col gap-3">
                  <div className="space-y-1">
                    {book.subjectName && <p className="text-xs text-gray-500">{book.subjectName}</p>}
                    <h2 className="font-semibold text-gray-900 leading-snug">{book.title}</h2>
                    {book.description && <p className="text-sm text-gray-600 line-clamp-3">{book.description}</p>}
                    {book.pageCount && <p className="text-xs text-gray-400">PDF · {book.pageCount} páginas</p>}
                  </div>

                  <div className="mt-auto space-y-2 pt-2">
                    {book.owned ? (
                      <>
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Na sua biblioteca
                        </Badge>
                        <div className="grid grid-cols-2 gap-2">
                          <a href={`/api/ebooks/${book.id}/file`} target="_blank" rel="noreferrer">
                            <Button className="w-full"><BookOpen className="w-4 h-4 mr-1.5" /> Ler</Button>
                          </a>
                          <a href={`/api/ebooks/${book.id}/file?download=1`}>
                            <Button variant="outline" className="w-full"><Download className="w-4 h-4 mr-1.5" /> Baixar</Button>
                          </a>
                        </div>
                      </>
                    ) : (
                      <>
                        {book.priceCents ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-2xl font-bold text-gray-900">{formatBRL(book.priceCents)}</span>
                            <BuyButton kind="ebook" ebookId={book.id} label="Comprar" />
                          </div>
                        ) : !trainingOffer ? (
                          <p className="text-sm text-gray-500">Em breve à venda.</p>
                        ) : null}
                        {trainingOffer && (
                          <p className="text-xs text-gray-500">
                            Incluído no treinamento{' '}
                            <Link href={`/student/training/${book.trainingId}`} className="font-medium text-blue-600 hover:underline">
                              {book.trainingName}
                            </Link>{' '}
                            ({formatBRL(book.trainingPriceCents!)}).
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {owned.length > 0 && owned.length < items.length && (
        <p className="text-xs text-gray-400">{owned.length} de {items.length} ebooks na sua biblioteca.</p>
      )}
    </div>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, orders } from '@/lib/db'
import { trainingsRepository } from '@/server/repositories/trainings'
import { getAccess, ownsTraining } from '@/server/services/access'
import { getSalesSettings } from '@/server/services/sales-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BuyButton } from '@/components/student/buy-button'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, Crown } from 'lucide-react'

export const metadata: Metadata = { title: 'Planos' }

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Aguardando pagamento', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Pago', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Recusado', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600' },
  refunded: { label: 'Estornado', className: 'bg-gray-100 text-gray-600' },
}

export default async function PlansPage() {
  const user = await requireUser()

  const [access, sales, catalog, myOrders] = await Promise.all([
    getAccess(user),
    getSalesSettings(),
    trainingsRepository.listPublished(),
    db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt))
      .limit(50),
  ])
  const forSale = catalog.filter(t => t.priceCents)
  // Orders that never reached the checkout aren't interesting to the student
  const history = myOrders.filter(o => o.status !== 'cancelled' || o.mpPaymentId)

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
        <p className="text-gray-500 mt-1">
          A conta gratuita dá acesso às 2 primeiras aulas de cada treinamento. Libere o restante comprando um treinamento
          {sales.lifetimeEnabled ? ' ou com o plano vitalício' : ''}.
        </p>
      </div>

      {access.lifetime ? (
        <Card className="border-2" style={{ borderColor: '#C9A227', backgroundColor: '#FFFBEB' }}>
          <CardContent className="p-6 flex items-center gap-4">
            <Crown className="w-10 h-10 flex-shrink-0" style={{ color: '#C9A227' }} />
            <div>
              <p className="font-semibold text-gray-900">Você tem o Plano Vitalício</p>
              <p className="text-sm text-gray-600">Todas as aulas de todos os treinamentos e todos os ebooks estão liberados para você.</p>
            </div>
          </CardContent>
        </Card>
      ) : sales.lifetimeEnabled ? (
        <Card className="border-2" style={{ borderColor: '#C9A227' }}>
          <CardContent className="p-6 md:p-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-widest flex items-center gap-1.5" style={{ color: '#92400E' }}>
                <Crown className="w-4 h-4" /> PLANO VITALÍCIO
              </p>
              <h2 className="text-xl font-bold text-gray-900">Acesso completo à plataforma, para sempre</h2>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {[
                  'Todas as aulas de todos os treinamentos',
                  'Todos os ebooks em PDF',
                  'Também os treinamentos que forem lançados depois',
                  'Pagamento único, sem mensalidade',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center md:text-right space-y-3">
              <p className="text-3xl font-bold text-gray-900">{formatBRL(sales.lifetimePriceCents)}</p>
              <BuyButton kind="lifetime" label="Assinar plano vitalício" className="w-full md:w-auto" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {forSale.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Treinamentos avulsos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {forSale.map(t => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  {t.description && <p className="text-sm text-gray-500 line-clamp-3">{t.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-xl font-bold text-gray-900">{formatBRL(t.priceCents!)}</span>
                    {ownsTraining(access, t.id) ? (
                      <Link href={`/student/training/${t.id}`}>
                        <Badge className="bg-green-100 text-green-700">Liberado — acessar</Badge>
                      </Link>
                    ) : (
                      <BuyButton kind="training" trainingId={t.id} label="Comprar" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Minhas compras</h2>
          <Card>
            <CardContent className="p-0 divide-y">
              {history.map(o => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{o.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700">{formatBRL(o.amountCents)}</span>
                    <Badge className={ORDER_STATUS[o.status]?.className}>{ORDER_STATUS[o.status]?.label ?? o.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

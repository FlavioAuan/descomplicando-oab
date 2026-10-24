import { Metadata } from 'next'
import Link from 'next/link'
import { and, eq } from 'drizzle-orm'
import { requireUser } from '@/server/actions/auth'
import { db, orders } from '@/lib/db'
import { syncPayment } from '@/server/services/orders'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Pagamento' }

// Mercado Pago sends the buyer back here with ?payment_id=…&external_reference=<order id>.
// The status shown comes from the Mercado Pago API, not from the query string.
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; external_reference?: string }>
}) {
  const user = await requireUser()
  const { payment_id: paymentId, external_reference: orderId } = await searchParams

  if (paymentId && /^\d+$/.test(paymentId)) {
    try {
      await syncPayment(paymentId)
    } catch (err) {
      console.error('[mercadopago] sync on return failed', err)
    }
  }

  const [order] = orderId
    ? await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, user.id))).limit(1)
    : []

  const status = order?.status ?? 'pending'
  const target = order?.kind === 'ebook'
    ? '/student/ebooks'
    : order?.kind === 'training' && order.trainingId ? `/student/training/${order.trainingId}` : '/student/training'

  const view = {
    approved: {
      icon: <CheckCircle2 className="w-14 h-14 text-green-600" />,
      title: 'Pagamento aprovado!',
      text: order?.kind === 'lifetime'
        ? 'Seu Plano Vitalício está ativo: todas as aulas de todos os treinamentos e todos os ebooks foram liberados.'
        : order?.kind === 'ebook'
          ? `Seu ${order.title} já está disponível em Ebooks.`
          : `As aulas de "${order?.title}" foram liberadas.`,
    },
    pending: {
      icon: <Clock className="w-14 h-14 text-yellow-500" />,
      title: 'Pagamento em processamento',
      text: 'Assim que o Mercado Pago confirmar o pagamento (no Pix costuma ser imediato; no boleto, até 3 dias úteis), as aulas serão liberadas automaticamente.',
    },
    failed: {
      icon: <XCircle className="w-14 h-14 text-red-500" />,
      title: 'Pagamento não concluído',
      text: 'O pagamento foi recusado ou cancelado. Você pode tentar novamente com outro meio de pagamento.',
    },
  }[status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : 'failed']

  return (
    <div className="max-w-lg mx-auto pt-8">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">{view.icon}</div>
          <h1 className="text-xl font-bold text-gray-900">{view.title}</h1>
          <p className="text-sm text-gray-600">{view.text}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link href={status === 'approved' ? target : '/student/plans'}>
              <Button className="w-full">
                {status !== 'approved' ? 'Ver planos' : order?.kind === 'ebook' ? 'Ler o ebook' : 'Começar a estudar'}
              </Button>
            </Link>
            {status !== 'approved' && (
              <Link href="/student/training">
                <Button variant="outline" className="w-full">Voltar aos treinamentos</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Metadata } from 'next'
import { getSalesAdminData } from '@/server/actions/sales'
import { MercadoPagoSettingsForm } from '@/components/admin/mercadopago-settings-form'
import { LifetimePlanForm } from '@/components/admin/lifetime-plan-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Vendas' }

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Pago', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Recusado', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600' },
  refunded: { label: 'Estornado', className: 'bg-gray-100 text-gray-600' },
}

export default async function PaymentsPage() {
  const data = await getSalesAdminData()
  const paid = data.orders.filter(o => o.status === 'approved')
  const revenue = paid.reduce((sum, o) => sum + o.amountCents, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
        <p className="text-gray-500 mt-1">
          Pagamentos pelo Mercado Pago, plano vitalício e pedidos. O preço de cada treinamento é definido na página do treinamento.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MercadoPagoSettingsForm {...data.mercadoPago} />
        <LifetimePlanForm enabled={data.lifetime.enabled} priceCents={data.lifetime.priceCents} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Pedidos</CardTitle>
            <p className="text-sm text-gray-500">
              {paid.length} pagos · {formatBRL(revenue)} {data.orders.length >= 200 ? '(últimos 200 pedidos)' : ''}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.orders.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">Nenhum pedido ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Aluno</th>
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 font-medium text-right">Valor</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Pagamento MP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.orders.map(o => (
                    <tr key={o.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">{formatDateTime(o.createdAt)}</td>
                      <td className="px-4 py-2">
                        <p className="text-gray-800">{o.userName}</p>
                        <p className="text-xs text-gray-400">{o.userEmail}</p>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{o.title}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">{formatBRL(o.amountCents)}</td>
                      <td className="px-4 py-2">
                        <Badge className={ORDER_STATUS[o.status]?.className}>{ORDER_STATUS[o.status]?.label ?? o.status}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 font-mono">{o.mpPaymentId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

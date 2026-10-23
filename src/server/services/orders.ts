import { eq } from 'drizzle-orm'
import { db, orders } from '@/lib/db'
import { getPayment } from '@/lib/mercadopago'
import { getSalesSettings } from './sales-settings'

type OrderStatus = typeof orders.$inferSelect['status']

function toOrderStatus(mpStatus: string): OrderStatus {
  switch (mpStatus) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    default: // pending, in_process, authorized, in_mediation
      return 'pending'
  }
}

/**
 * Reads a payment from Mercado Pago (never trusting what the browser or the
 * notification says) and updates the order it belongs to. Returns the order.
 */
export async function syncPayment(paymentId: string) {
  const { accessToken } = await getSalesSettings()
  if (!accessToken) throw new Error('Mercado Pago não configurado')

  const payment = await getPayment(accessToken, paymentId)
  if (!payment.external_reference) return null

  const [order] = await db.select().from(orders).where(eq(orders.id, payment.external_reference)).limit(1)
  if (!order) return null

  let status = toOrderStatus(payment.status)
  // Only accept a payment for the full price of the order, in reais
  const paidCents = Math.round(payment.transaction_amount * 100)
  if (status === 'approved' && (payment.currency_id !== 'BRL' || paidCents < order.amountCents)) {
    console.error('[mercadopago] payment amount mismatch', { orderId: order.id, paymentId, paidCents })
    status = 'rejected'
  }

  // A later failed attempt must not undo an approved payment of the same order
  if (order.status === 'approved' && status !== 'refunded' && String(payment.id) !== order.mpPaymentId) {
    return order
  }

  const update = {
    status,
    mpPaymentId: String(payment.id),
    mpStatus: payment.status,
    paidAt: status === 'approved' ? (payment.date_approved ? new Date(payment.date_approved) : new Date()) : order.paidAt,
    updatedAt: new Date(),
  }
  await db.update(orders).set(update).where(eq(orders.id, order.id))
  return { ...order, ...update }
}

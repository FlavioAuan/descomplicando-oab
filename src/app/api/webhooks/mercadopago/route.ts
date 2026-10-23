import { NextResponse, type NextRequest } from 'next/server'
import { isValidWebhookSignature } from '@/lib/mercadopago'
import { getSalesSettings } from '@/server/services/sales-settings'
import { syncPayment } from '@/server/services/orders'

// Mercado Pago payment notifications. The payment is always re-read from the
// Mercado Pago API, so the notification body itself is never trusted.

export async function POST(request: NextRequest) {
  const url = request.nextUrl
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } }

  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body.type ?? body.topic
  const dataId = String(url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? body.data?.id ?? '')
  if (type !== 'payment' || !dataId) return NextResponse.json({ ignored: true })

  const { webhookSecret } = await getSalesSettings()
  if (webhookSecret) {
    const valid = isValidWebhookSignature({
      secret: webhookSecret,
      signatureHeader: request.headers.get('x-signature'),
      requestId: request.headers.get('x-request-id'),
      dataId,
    })
    if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  try {
    const order = await syncPayment(dataId)
    return NextResponse.json({ ok: true, order: order?.id ?? null })
  } catch (err) {
    console.error('[mercadopago] webhook failed', err)
    // Non-2xx makes Mercado Pago retry later
    return NextResponse.json({ error: 'sync failed' }, { status: 500 })
  }
}

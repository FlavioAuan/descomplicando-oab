import crypto from 'crypto'

// Minimal Mercado Pago REST client (Checkout Pro). Docs:
// https://www.mercadopago.com.br/developers/pt/reference

// MERCADOPAGO_API_URL only exists to point local tests at a fake server
const API = process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com'

export class MercadoPagoError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

async function call<T>(accessToken: string, path: string, init?: { method?: string; body?: unknown; idempotencyKey?: string }) {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.idempotencyKey && { 'X-Idempotency-Key': init.idempotencyKey }),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = (data as { message?: string }).message ?? `HTTP ${res.status}`
    throw new MercadoPagoError(message, res.status)
  }
  return data as T
}

export type Preference = { id: string; init_point: string; sandbox_init_point: string }

export function createPreference(accessToken: string, params: {
  orderId: string
  title: string
  amountCents: number
  payerEmail: string
  baseUrl: string
}) {
  const back = `${params.baseUrl}/student/checkout/return`
  return call<Preference>(accessToken, '/checkout/preferences', {
    method: 'POST',
    idempotencyKey: params.orderId,
    body: {
      items: [{
        id: params.orderId,
        title: params.title,
        quantity: 1,
        unit_price: params.amountCents / 100,
        currency_id: 'BRL',
      }],
      payer: { email: params.payerEmail },
      external_reference: params.orderId,
      back_urls: { success: back, pending: back, failure: back },
      // Mercado Pago only redirects automatically to https URLs
      ...(params.baseUrl.startsWith('https://') && { auto_return: 'approved' }),
      notification_url: params.baseUrl.startsWith('https://') ? `${params.baseUrl}/api/webhooks/mercadopago` : undefined,
      statement_descriptor: 'DESCOMPLICANDOAB',
    },
  })
}

export type Payment = {
  id: number
  status: string // approved | pending | in_process | authorized | rejected | cancelled | refunded | charged_back
  external_reference: string | null
  transaction_amount: number
  currency_id: string
  date_approved: string | null
}

export function getPayment(accessToken: string, paymentId: string) {
  return call<Payment>(accessToken, `/v1/payments/${encodeURIComponent(paymentId)}`)
}

/** Account behind the token; used by the admin "testar conexão" button. */
export function getAccount(accessToken: string) {
  return call<{ id: number; nickname: string; email?: string; site_id: string }>(accessToken, '/users/me')
}

/**
 * Validates the x-signature header of a webhook notification
 * (https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks).
 */
export function isValidWebhookSignature(params: {
  secret: string
  signatureHeader: string | null
  requestId: string | null
  dataId: string
}) {
  if (!params.signatureHeader) return false
  const parts = Object.fromEntries(
    params.signatureHeader.split(',').map(p => p.split('=').map(s => s.trim()) as [string, string]),
  )
  if (!parts.ts || !parts.v1) return false

  const dataId = /^[a-z0-9]+$/i.test(params.dataId) ? params.dataId.toLowerCase() : params.dataId
  let manifest = `id:${dataId};`
  if (params.requestId) manifest += `request-id:${params.requestId};`
  manifest += `ts:${parts.ts};`

  const expected = crypto.createHmac('sha256', params.secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(parts.v1)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

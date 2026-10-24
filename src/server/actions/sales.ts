'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireRole, requireUser } from './auth'
import { db, ebooks, orders, systemSettings, trainings, users } from '@/lib/db'
import { appUrl } from '@/lib/app-url'
import { parseBRL } from '@/lib/money'
import { MercadoPagoError, createPreference, getAccount } from '@/lib/mercadopago'
import { SALES_KEYS, getSalesSettings, maskSecret } from '../services/sales-settings'
import { getAccess, ownsEbook, ownsTraining } from '../services/access'

// ─── Student: checkout ────────────────────────────────────────────────────────

const checkoutSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('lifetime') }),
  z.object({ kind: z.literal('training'), trainingId: z.string().uuid() }),
  z.object({ kind: z.literal('ebook'), ebookId: z.string().uuid() }),
])

export async function startCheckout(
  input: { kind: 'lifetime' } | { kind: 'training'; trainingId: string } | { kind: 'ebook'; ebookId: string },
): Promise<{ url: string } | { error: string }> {
  const user = await requireUser()
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { error: 'Pedido inválido' }

  const settings = await getSalesSettings()
  if (!settings.accessToken) return { error: 'Os pagamentos ainda não estão disponíveis. Tente mais tarde.' }

  const access = await getAccess(user)
  let title: string
  let amountCents: number
  let trainingId: string | null = null
  let ebookId: string | null = null

  if (parsed.data.kind === 'lifetime') {
    if (!settings.lifetimeEnabled) return { error: 'O plano vitalício não está disponível no momento.' }
    if (access.lifetime) return { error: 'Você já tem o plano vitalício.' }
    title = 'DescomplicandOAB — Plano Vitalício'
    amountCents = settings.lifetimePriceCents
  } else if (parsed.data.kind === 'ebook') {
    const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, parsed.data.ebookId)).limit(1)
    if (!ebook || !ebook.priceCents) return { error: 'Este ebook não está à venda.' }
    if (ownsEbook(access, ebook)) return { error: 'Você já tem acesso a este ebook.' }
    title = `Ebook — ${ebook.title}`
    amountCents = ebook.priceCents
    ebookId = ebook.id
  } else {
    const [training] = await db.select().from(trainings).where(eq(trainings.id, parsed.data.trainingId)).limit(1)
    if (!training || training.status !== 'approved' || !training.priceCents) {
      return { error: 'Este treinamento não está à venda.' }
    }
    if (ownsTraining(access, training.id)) return { error: 'Você já tem acesso a este treinamento.' }
    title = training.name
    amountCents = training.priceCents
    trainingId = training.id
  }

  const orderId = crypto.randomUUID()
  await db.insert(orders).values({ id: orderId, userId: user.id, kind: parsed.data.kind, trainingId, ebookId, title, amountCents })

  try {
    const preference = await createPreference(settings.accessToken, {
      orderId,
      title,
      amountCents,
      payerEmail: user.email,
      baseUrl: await appUrl(),
    })
    await db.update(orders).set({ mpPreferenceId: preference.id }).where(eq(orders.id, orderId))
    return { url: preference.init_point }
  } catch (err) {
    console.error('[mercadopago] failed to create preference', err)
    await db.update(orders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(orders.id, orderId))
    return { error: 'Não foi possível iniciar o pagamento. Tente novamente em instantes.' }
  }
}

// ─── Admin: Mercado Pago, lifetime plan, prices ──────────────────────────────

async function upsertSetting(key: string, value: string) {
  const now = new Date()
  await db
    .insert(systemSettings)
    .values({ key, value, updatedAt: now })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: now } })
}

export async function getSalesAdminData() {
  await requireRole('admin', 'super_admin')
  const settings = await getSalesSettings()

  const recentOrders = await db
    .select({
      id: orders.id,
      title: orders.title,
      kind: orders.kind,
      amountCents: orders.amountCents,
      status: orders.status,
      mpPaymentId: orders.mpPaymentId,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .orderBy(desc(orders.createdAt))
    .limit(200)

  return {
    mercadoPago: {
      accessTokenMask: maskSecret(settings.accessToken),
      webhookSecretMask: maskSecret(settings.webhookSecret),
      accessTokenFromEnv: settings.accessTokenFromEnv,
      webhookSecretFromEnv: settings.webhookSecretFromEnv,
      isTestToken: settings.accessToken.startsWith('TEST-'),
      webhookUrl: `${await appUrl()}/api/webhooks/mercadopago`,
    },
    lifetime: { enabled: settings.lifetimeEnabled, priceCents: settings.lifetimePriceCents },
    orders: recentOrders,
  }
}

export async function saveMercadoPagoSettings(input: { accessToken: string; webhookSecret: string }) {
  await requireRole('admin', 'super_admin')
  const accessToken = input.accessToken.trim()
  const webhookSecret = input.webhookSecret.trim()

  // Blank fields keep what is already saved
  if (accessToken) {
    if (!/^(APP_USR|TEST)-/.test(accessToken)) return { error: 'O Access Token começa com APP_USR- (ou TEST- nas credenciais de teste).' }
    try {
      await getAccount(accessToken)
    } catch (err) {
      return { error: `O Mercado Pago recusou o Access Token: ${err instanceof Error ? err.message : 'erro desconhecido'}` }
    }
    await upsertSetting(SALES_KEYS.accessToken, accessToken)
  }
  if (webhookSecret) await upsertSetting(SALES_KEYS.webhookSecret, webhookSecret)

  revalidatePath('/admin/payments')
  return { success: true as const }
}

export async function removeMercadoPagoSettings() {
  await requireRole('admin', 'super_admin')
  await upsertSetting(SALES_KEYS.accessToken, '')
  await upsertSetting(SALES_KEYS.webhookSecret, '')
  revalidatePath('/admin/payments')
  return { success: true as const }
}

export async function testMercadoPagoConnection(): Promise<{ account: string } | { error: string }> {
  await requireRole('admin', 'super_admin')
  const { accessToken } = await getSalesSettings()
  if (!accessToken) return { error: 'Nenhum Access Token configurado.' }
  try {
    const account = await getAccount(accessToken)
    return { account: `${account.nickname}${account.email ? ` (${account.email})` : ''} — conta ${account.id}` }
  } catch (err) {
    return { error: err instanceof MercadoPagoError ? err.message : 'Falha ao conectar com o Mercado Pago' }
  }
}

export async function saveLifetimePlan(input: { enabled: boolean; price: string }) {
  await requireRole('admin', 'super_admin')
  const cents = parseBRL(input.price)
  if (!cents || cents < 100) return { error: 'Informe um preço válido (ex.: 1.499,00).' }

  await upsertSetting(SALES_KEYS.lifetimeEnabled, input.enabled ? 'true' : 'false')
  await upsertSetting(SALES_KEYS.lifetimePriceCents, String(cents))
  revalidatePath('/admin/payments')
  revalidatePath('/student', 'layout')
  return { success: true as const }
}

export async function saveTrainingPrice(input: { trainingId: string; price: string }) {
  await requireRole('admin', 'super_admin')
  let priceCents: number | null = null
  if (input.price.trim()) {
    priceCents = parseBRL(input.price)
    if (!priceCents || priceCents < 100) return { error: 'Informe um preço válido (ex.: 297,00) ou deixe em branco.' }
  }

  await db.update(trainings).set({ priceCents, updatedAt: new Date() }).where(eq(trainings.id, input.trainingId))
  revalidatePath(`/admin/trainings/${input.trainingId}`)
  revalidatePath('/admin/trainings')
  revalidatePath('/student', 'layout')
  return { success: true as const, priceCents }
}

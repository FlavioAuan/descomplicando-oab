import { inArray } from 'drizzle-orm'
import { db, systemSettings } from '@/lib/db'

// Sales configuration kept in system_settings. The Mercado Pago credentials are
// entered in the admin; MERCADOPAGO_ACCESS_TOKEN / MERCADOPAGO_WEBHOOK_SECRET in
// the environment take precedence when set.

export const SALES_KEYS = {
  accessToken: 'mercadopago_access_token',
  webhookSecret: 'mercadopago_webhook_secret',
  lifetimeEnabled: 'lifetime_plan_enabled',
  lifetimePriceCents: 'lifetime_plan_price_cents',
} as const

export const DEFAULT_LIFETIME_PRICE_CENTS = 149900

export type SalesSettings = {
  accessToken: string
  webhookSecret: string
  accessTokenFromEnv: boolean
  webhookSecretFromEnv: boolean
  lifetimeEnabled: boolean
  lifetimePriceCents: number
}

function env(name: string) {
  return (process.env[name] ?? '').replace(/^﻿/, '').trim()
}

export async function getSalesSettings(): Promise<SalesSettings> {
  const rows = await db
    .select()
    .from(systemSettings)
    .where(inArray(systemSettings.key, Object.values(SALES_KEYS)))
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const envToken = env('MERCADOPAGO_ACCESS_TOKEN')
  const envSecret = env('MERCADOPAGO_WEBHOOK_SECRET')
  const price = Number(map[SALES_KEYS.lifetimePriceCents])

  return {
    accessToken: envToken || map[SALES_KEYS.accessToken] || '',
    webhookSecret: envSecret || map[SALES_KEYS.webhookSecret] || '',
    accessTokenFromEnv: Boolean(envToken),
    webhookSecretFromEnv: Boolean(envSecret),
    lifetimeEnabled: map[SALES_KEYS.lifetimeEnabled] === 'true',
    lifetimePriceCents: Number.isInteger(price) && price > 0 ? price : DEFAULT_LIFETIME_PRICE_CENTS,
  }
}

/** What the admin form may see: never the secrets themselves, only their last characters. */
export function maskSecret(value: string) {
  if (!value) return ''
  return `••••${value.slice(-4)}`
}

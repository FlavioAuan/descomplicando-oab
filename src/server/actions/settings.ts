'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, systemSettings } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

export type AIProvider = 'openrouter' | 'openai' | 'grok'

export interface AISettings {
  provider: AIProvider
  apiKey: string
  model: string
}

const PROVIDER_DEFAULTS: Record<AIProvider, string> = {
  openrouter: 'openrouter/auto',
  openai: 'gpt-4o-mini',
  grok: 'grok-3-mini',
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, ['ai_provider', 'ai_api_key', 'ai_model']))

    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

    const provider = (map['ai_provider'] as AIProvider) || 'openrouter'
    const apiKey = map['ai_api_key'] || process.env.OPENROUTER_API_KEY || ''
    const model = map['ai_model'] || process.env.OPENROUTER_MODEL || PROVIDER_DEFAULTS[provider]

    return { provider, apiKey, model }
  } catch {
    return {
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
    }
  }
}

const saveSchema = z.object({
  provider: z.enum(['openrouter', 'openai', 'grok']),
  apiKey: z.string().min(1, 'Chave de API obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
})

export async function saveAISettings(
  input: AISettings
): Promise<{ success: true } | { error: string }> {
  await requireRole('admin', 'super_admin')

  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { provider, apiKey, model } = parsed.data
  const now = new Date()

  const upsert = (key: string, value: string) =>
    db
      .insert(systemSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: now },
      })

  await Promise.all([
    upsert('ai_provider', provider),
    upsert('ai_api_key', apiKey),
    upsert('ai_model', model),
  ])

  revalidatePath('/super-admin/settings')
  revalidatePath('/admin/settings')
  return { success: true }
}

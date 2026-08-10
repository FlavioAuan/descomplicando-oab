'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, systemSettings } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

export type AIProvider = 'openrouter' | 'openai' | 'groq'

export interface AISettings {
  provider: AIProvider
  apiKey: string
  model: string
}

const PROVIDER_DEFAULTS: Record<AIProvider, string> = {
  openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.1-8b-instant',
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, ['ai_provider', 'ai_api_key', 'ai_model']))

    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

    // Migrate legacy 'grok' value saved before rename to 'groq'
    const rawProvider = map['ai_provider'] === 'grok' ? 'groq' : map['ai_provider']
    const provider = (rawProvider as AIProvider) || 'openrouter'
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
  provider: z.enum(['openrouter', 'openai', 'groq']),
  apiKey: z.string().min(1, 'Chave de API obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
})

export async function fetchOpenRouterFreeModels(): Promise<
  { id: string; name: string }[]
> {
  const settings = await getAISettings()
  if (!settings.apiKey) return []

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return []

    const data = await res.json()
    return ((data.data ?? []) as { id: string; name: string; pricing?: { prompt: string } }[])
      .filter(m => m.id.endsWith(':free'))
      .map(m => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.id.localeCompare(b.id))
  } catch {
    return []
  }
}

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

  // Bust the in-memory cache so the next AI call picks up the new settings immediately
  const { bustAISettingsCache } = await import('@/lib/ai/claude')
  bustAISettingsCache()

  revalidatePath('/super-admin/settings')
  revalidatePath('/admin/settings')
  return { success: true }
}

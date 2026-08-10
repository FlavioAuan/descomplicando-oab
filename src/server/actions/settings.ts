'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, systemSettings } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

export type AIProvider = 'openrouter' | 'openai' | 'groq'

export interface AISettings {
  provider: AIProvider
  apiKey: string  // always read from env — never stored in DB
  model: string
}

const PROVIDER_DEFAULTS: Record<AIProvider, string> = {
  openrouter: 'mistralai/mistral-7b-instruct:free',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.1-8b-instant',
}

// API keys live in env vars, never in the database
function getApiKeyFromEnv(provider: AIProvider): string {
  switch (provider) {
    case 'groq':       return process.env.GROQ_API_KEY ?? ''
    case 'openai':     return process.env.OPENAI_API_KEY ?? ''
    case 'openrouter': return process.env.OPENROUTER_API_KEY ?? ''
  }
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, ['ai_provider', 'ai_model']))

    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

    // Migrate legacy 'grok' value saved before the rename to 'groq'
    const rawProvider = map['ai_provider'] === 'grok' ? 'groq' : map['ai_provider']
    const provider = (rawProvider as AIProvider) || 'openrouter'
    const model = map['ai_model'] || process.env.OPENROUTER_MODEL || PROVIDER_DEFAULTS[provider]
    const apiKey = getApiKeyFromEnv(provider)

    return { provider, apiKey, model }
  } catch {
    const provider: AIProvider = 'openrouter'
    return {
      provider,
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? PROVIDER_DEFAULTS.openrouter,
    }
  }
}

// Returns the OpenRouter key from env (used for automatic fallback)
export function getOpenRouterFallbackKey(): string {
  return process.env.OPENROUTER_API_KEY ?? ''
}

const saveSchema = z.object({
  provider: z.enum(['openrouter', 'openai', 'groq']),
  model: z.string().min(1, 'Modelo obrigatório'),
})

export async function saveAISettings(
  input: { provider: AIProvider; model: string }
): Promise<{ success: true } | { error: string }> {
  await requireRole('admin', 'super_admin')

  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { provider, model } = parsed.data
  const now = new Date()

  const upsert = (key: string, value: string) =>
    db
      .insert(systemSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: now } })

  await Promise.all([
    upsert('ai_provider', provider),
    upsert('ai_model', model),
    // Remove any previously stored key from the DB for security
    db.delete(systemSettings).where(eq(systemSettings.key, 'ai_api_key')),
  ])

  const { bustAISettingsCache } = await import('@/lib/ai/claude')
  bustAISettingsCache()

  revalidatePath('/super-admin/settings')
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function fetchOpenRouterFreeModels(): Promise<{ id: string; name: string }[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return []

    const data = await res.json()
    return ((data.data ?? []) as { id: string; name: string }[])
      .filter(m => m.id.endsWith(':free'))
      .map(m => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.id.localeCompare(b.id))
  } catch {
    return []
  }
}

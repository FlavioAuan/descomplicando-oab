// AI client — supports OpenRouter, OpenAI and xAI (Grok) via OpenAI-compatible API

import type { AIProvider } from '@/server/actions/settings'

const BASE_URLS: Record<AIProvider, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  grok: 'https://api.x.ai/v1',
}

// ─── Settings cache (avoids DB hit on every AI call) ─────────────────────────

interface CachedSettings {
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl: string
  expiresAt: number
}

let _cache: CachedSettings | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function bustAISettingsCache() {
  _cache = null
}

async function loadSettings(): Promise<CachedSettings> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache

  try {
    const { getAISettings } = await import('@/server/actions/settings')
    const s = await getAISettings()
    _cache = {
      provider: s.provider,
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: BASE_URLS[s.provider],
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
  } catch {
    // Fall back to env vars if DB is unavailable
    const provider: AIProvider = 'openrouter'
    _cache = {
      provider,
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? 'openrouter/auto',
      baseUrl: BASE_URLS[provider],
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
  }

  if (!_cache.apiKey) throw new Error('Nenhuma chave de API configurada. Acesse Configurações IA.')
  return _cache
}

function buildHeaders(apiKey: string, provider: AIProvider): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://descomplicandoab.vercel.app'
    headers['X-Title'] = 'DescomplicandOAB'
  }
  return headers
}

// ─── Non-streaming ────────────────────────────────────────────────────────────

export async function callClaude(
  prompt: string,
  systemPrompt?: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const { baseUrl, apiKey, model, provider } = await loadSettings()

  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, provider),
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${provider} ${res.status}: ${body}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const msg = choice?.message

  // Some "thinking" models put output in reasoning_content instead of content
  const content =
    (msg?.content as string | null) ||
    (msg?.reasoning_content as string | null) ||
    ''

  if (!content) {
    console.error('[callClaude] empty content. Full response:', JSON.stringify(data, null, 2))
    const reason = choice?.finish_reason ?? 'unknown'
    const usedModel = data.model ?? model
    throw new Error(
      `Modelo ${usedModel} retornou resposta vazia (finish_reason: ${reason}). ` +
      `Acesse Configurações IA e troque para google/gemini-flash-1.5`
    )
  }

  return content
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export async function callClaudeJSON<T>(
  prompt: string,
  systemPrompt?: string,
  options?: { maxTokens?: number }
): Promise<T> {
  const sys = `${systemPrompt ?? ''}\n\nResponda SEMPRE em JSON válido, sem markdown, sem explicações adicionais.`.trim()
  const text = await callClaude(prompt, sys, options)

  try {
    let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Find the first JSON structure in case the model prepended text
    const firstBracket = clean.indexOf('[')
    const firstBrace = clean.indexOf('{')
    const start =
      firstBracket === -1 ? firstBrace
      : firstBrace === -1 ? firstBracket
      : Math.min(firstBracket, firstBrace)

    if (start > 0) clean = clean.slice(start)

    // Trim anything after the closing bracket/brace
    const lastBracket = clean.lastIndexOf(']')
    const lastBrace = clean.lastIndexOf('}')
    const end = Math.max(lastBracket, lastBrace)
    if (end !== -1 && end < clean.length - 1) clean = clean.slice(0, end + 1)

    return JSON.parse(clean) as T
  } catch {
    console.error('[callClaudeJSON] parse failed. Raw response:\n', text)
    throw new Error(`IA retornou JSON inválido: ${text.substring(0, 500)}`)
  }
}

// ─── Streaming (SSE) ──────────────────────────────────────────────────────────

export async function* streamClaude(
  prompt: string,
  systemPrompt?: string
): AsyncGenerator<string> {
  const { baseUrl, apiKey, model, provider } = await loadSettings()

  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, provider),
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 8192,
      stream: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${provider} stream ${res.status}: ${body}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

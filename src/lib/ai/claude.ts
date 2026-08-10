// AI client — supports OpenRouter, OpenAI and Groq via OpenAI-compatible API

import type { AIProvider } from '@/server/actions/settings'

const BASE_URLS: Record<AIProvider, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
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
    const provider: AIProvider = 'openrouter'
    _cache = {
      provider,
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? 'mistralai/mistral-7b-instruct:free',
      baseUrl: BASE_URLS[provider],
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
  }

  if (!_cache.apiKey) throw new Error(
    'Nenhuma chave de API configurada. Defina GROQ_API_KEY, OPENROUTER_API_KEY ou OPENAI_API_KEY nas variáveis de ambiente.'
  )
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

// ─── Parse error body ─────────────────────────────────────────────────────────

function parseErrorBody(body: string): string {
  try {
    const parsed = JSON.parse(body)
    return parsed.error?.message ?? body
  } catch {
    return body
  }
}

// ─── Core fetch (accepts explicit settings, enabling fallback) ────────────────

async function fetchCompletion(
  messages: { role: string; content: string }[],
  settings: CachedSettings,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const { baseUrl, apiKey, model, provider } = settings

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey, provider),
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  })

  if (!res.ok) {
    const body = await res.text()
    const errMsg = parseErrorBody(body)

    // Auto-fallback: Groq daily/rate limit → OpenRouter (transparent, this request only)
    if (provider === 'groq' && res.status === 429) {
      const orKey = process.env.OPENROUTER_API_KEY
      if (orKey) {
        const fallbackModel = process.env.OPENROUTER_MODEL ?? 'mistralai/mistral-7b-instruct:free'
        console.warn(`[AI] Groq limite atingido. Usando OpenRouter (${fallbackModel}) para esta requisição.`)
        return fetchCompletion(messages, {
          provider: 'openrouter',
          apiKey: orKey,
          model: fallbackModel,
          baseUrl: BASE_URLS.openrouter,
          expiresAt: 0,
        }, maxTokens, temperature)
      }
      throw new Error(`Groq: limite diário de tokens atingido e OPENROUTER_API_KEY não está configurada para fallback automático. Resposta: ${errMsg}`)
    }

    throw new Error(`Erro ${provider} (${res.status}): ${errMsg}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const msg = choice?.message

  // Handle Gemini-style array content (parts instead of plain string)
  let rawContent: string
  if (typeof msg?.content === 'string') {
    rawContent = msg.content
  } else if (Array.isArray(msg?.content)) {
    rawContent = (msg.content as Array<{ type: string; text?: string }>)
      .filter(p => p.type === 'text')
      .map(p => p.text ?? '')
      .join('')
  } else {
    rawContent = ''
  }

  // Thinking models expose output via reasoning_content / reasoning when content is empty
  const content =
    rawContent ||
    (msg?.reasoning_content as string | null) ||
    (msg?.reasoning as string | null) ||
    ''

  if (!content) {
    const reason = choice?.finish_reason ?? 'unknown'
    const usedModel = data.model ?? model
    const hint = reason === 'length'
      ? 'O modelo esgotou os tokens. Tente um modelo com contexto maior em Configurações IA.'
      : 'Acesse Configurações IA e troque o modelo.'
    console.error('[AI] empty content:', usedModel, 'finish_reason:', reason)
    throw new Error(`Modelo ${usedModel} retornou resposta vazia. ${hint}`)
  }

  return content
}

// ─── Non-streaming ────────────────────────────────────────────────────────────

export async function callClaude(
  prompt: string,
  systemPrompt?: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const settings = await loadSettings()

  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  return fetchCompletion(messages, settings, options?.maxTokens ?? 4096, options?.temperature ?? 0.7)
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export async function callClaudeJSON<T>(
  prompt: string,
  systemPrompt?: string,
  options?: { maxTokens?: number }
): Promise<T> {
  const sys = `${systemPrompt ?? ''}\n\nResponda SEMPRE em JSON válido, sem markdown, sem explicações adicionais.`.trim()
  const text = await callClaude(prompt, sys, options)

  // Quick check: if there's no JSON structure, it's a safety message or wrong model
  if (!text.includes('{') && !text.includes('[')) {
    console.error('[AI] no JSON in response:', text)
    throw new Error(
      `O modelo não retornou JSON. Isso ocorre com modelos que ativam filtros de segurança. ` +
      `Acesse Configurações IA e troque o modelo (recomendado: llama-3.1-8b-instant no Groq). ` +
      `Resposta recebida: "${text.substring(0, 120)}"`
    )
  }

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
    console.error('[AI] JSON parse failed. Raw:\n', text)
    throw new Error(
      `IA retornou JSON inválido. Tente trocar o modelo em Configurações IA. ` +
      `Resposta: ${text.substring(0, 300)}`
    )
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
    body: JSON.stringify({ model, messages, max_tokens: 8192, stream: true }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro ${provider} stream (${res.status}): ${parseErrorBody(body)}`)
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

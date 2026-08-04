// AI client — powered by OpenRouter (Free Models Router)
// https://openrouter.ai/openrouter/free

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function getHeaders(): Record<string, string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY env var is not set')
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://descomplicandoab.vercel.app',
    'X-Title': 'DescomplicandOAB',
  }
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? 'openrouter/auto'
}

// ─── Non-streaming ────────────────────────────────────────────────────────────

export async function callClaude(
  prompt: string,
  systemPrompt?: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${body}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content as string) ?? ''
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
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean) as T
  } catch {
    throw new Error(`IA retornou JSON inválido: ${text.substring(0, 200)}`)
  }
}

// ─── Streaming (SSE) ──────────────────────────────────────────────────────────

export async function* streamClaude(
  prompt: string,
  systemPrompt?: string
): AsyncGenerator<string> {
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: 8192,
      stream: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter stream ${res.status}: ${body}`)
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

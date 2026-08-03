import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

export async function callClaude(
  prompt: string,
  systemPrompt?: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options?.maxTokens || 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

export async function callClaudeJSON<T>(
  prompt: string,
  systemPrompt?: string,
  options?: { maxTokens?: number }
): Promise<T> {
  const fullSystem = `${systemPrompt || ''}\n\nResponda SEMPRE em JSON válido, sem markdown, sem explicações adicionais.`
  const text = await callClaude(prompt, fullSystem, options)

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean) as T
  } catch {
    throw new Error(`Invalid JSON response from Claude: ${text.substring(0, 200)}`)
  }
}

export async function* streamClaude(
  prompt: string,
  systemPrompt?: string
): AsyncGenerator<string> {
  const stream = await anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

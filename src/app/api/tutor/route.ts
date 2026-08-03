import { NextRequest } from 'next/server'
import { requireUser } from '@/server/actions/auth'
import { answerWithRag } from '@/lib/ai/rag'
import { streamClaude } from '@/lib/ai/claude'
import { buildRagContext } from '@/lib/ai/rag'

export async function POST(req: NextRequest) {
  try {
    await requireUser()
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const {
    message,
    subjectId,
    conversationHistory,
    stream: useStream = true,
  } = await req.json()

  if (!message) {
    return new Response('Message required', { status: 400 })
  }

  if (useStream) {
    const encoder = new TextEncoder()

    const ragContext = await buildRagContext({
      query: message,
      subjectId,
      limit: 4,
    })

    const historySection = conversationHistory?.length
      ? '\n\nHistórico:\n' +
        conversationHistory
          .slice(-6)
          .map((h: { role: string; content: string }) =>
            `${h.role === 'user' ? 'Aluno' : 'Tutor'}: ${h.content}`
          )
          .join('\n')
      : ''

    const contextSection = ragContext
      ? `\n\nContexto jurídico relevante:\n${ragContext}`
      : ''

    const prompt = `${historySection}${contextSection}\n\nAluno: ${message}`

    const systemPrompt = `Você é um tutor jurídico especializado na OAB (1ª fase). Responda de forma didática, citando artigos e jurisprudência quando relevante. Use markdown para formatação.`

    const streamBody = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamClaude(prompt, systemPrompt)) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(streamBody, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  }

  // Non-streaming response
  const answer = await answerWithRag({
    question: message,
    subjectId,
    conversationHistory,
  })

  return Response.json({ answer })
}

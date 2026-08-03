import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { streamApostila } from '@/lib/ai/generate'
import { buildRagContext } from '@/lib/ai/rag'
import { db, apostilas } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'super_admin')
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const { subject, subtheme, microtheme, subjectId, stream: useStream = true } = await req.json()

  if (!subject || !subtheme) {
    return NextResponse.json({ error: 'Subject and subtheme required' }, { status: 400 })
  }

  const ragContext = await buildRagContext({
    query: `${subject} ${subtheme} ${microtheme || ''}`,
    subjectId,
    limit: 5,
  })

  if (useStream) {
    const encoder = new TextEncoder()

    const streamBody = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamApostila({
            subject,
            subtheme,
            microtheme: microtheme || subtheme,
            ragContext,
          })) {
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

  // Non-streaming
  const { generateApostila } = await import('@/lib/ai/generate')
  const content = await generateApostila({
    subject,
    subtheme,
    microtheme: microtheme || subtheme,
    ragContext,
  })

  return NextResponse.json({ content })
}

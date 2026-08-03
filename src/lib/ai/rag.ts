import { db, knowledgeChunks, knowledgeFiles } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { callClaude } from './claude'

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

export function splitIntoChunks(text: string): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  return chunks
}

export async function processDocument(params: {
  fileId: string
  content: string
  subjectId?: string
  subsubjectId?: string
  microtopicId?: string
}): Promise<number> {
  const chunks = splitIntoChunks(params.content)
  let inserted = 0

  // Delete existing chunks for this file
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.fileId, params.fileId))

  for (let i = 0; i < chunks.length; i++) {
    await db.insert(knowledgeChunks).values({
      fileId: params.fileId,
      content: chunks[i],
      chunkIndex: i,
      subjectId: params.subjectId,
      subsubjectId: params.subsubjectId,
      microtopicId: params.microtopicId,
    })
    inserted++
  }

  return inserted
}

export async function searchKnowledge(params: {
  query: string
  subjectId?: string
  limit?: number
}): Promise<Array<{ content: string; fileId: string; relevance: number }>> {
  const limit = params.limit || 5

  // Simple text search using PostgreSQL full-text search
  // In production, you'd use pgvector with embeddings
  const results = await db
    .select({
      content: knowledgeChunks.content,
      fileId: knowledgeChunks.fileId,
      relevance: sql<number>`ts_rank(
        to_tsvector('portuguese', ${knowledgeChunks.content}),
        plainto_tsquery('portuguese', ${params.query})
      )`.as('relevance'),
    })
    .from(knowledgeChunks)
    .where(
      params.subjectId
        ? sql`${knowledgeChunks.subjectId} = ${params.subjectId} AND to_tsvector('portuguese', ${knowledgeChunks.content}) @@ plainto_tsquery('portuguese', ${params.query})`
        : sql`to_tsvector('portuguese', ${knowledgeChunks.content}) @@ plainto_tsquery('portuguese', ${params.query})`
    )
    .orderBy(sql`relevance DESC`)
    .limit(limit)

  return results.map(r => ({
    content: r.content,
    fileId: r.fileId,
    relevance: r.relevance || 0,
  }))
}

export async function buildRagContext(params: {
  query: string
  subjectId?: string
  limit?: number
}): Promise<string> {
  const chunks = await searchKnowledge(params)

  if (chunks.length === 0) return ''

  return chunks
    .map((c, i) => `[Trecho ${i + 1}]\n${c.content}`)
    .join('\n\n---\n\n')
}

export async function answerWithRag(params: {
  question: string
  subjectId?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const ragContext = await buildRagContext({
    query: params.question,
    subjectId: params.subjectId,
    limit: 5,
  })

  const contextSection = ragContext
    ? `\n\nCONTEXTO DA BASE JURÍDICA:\n${ragContext}\n`
    : ''

  const historySection = params.conversationHistory?.length
    ? '\n\nHISTÓRICO DA CONVERSA:\n' +
      params.conversationHistory
        .slice(-6)
        .map(h => `${h.role === 'user' ? 'Aluno' : 'Tutor'}: ${h.content}`)
        .join('\n')
    : ''

  const prompt = `${historySection}${contextSection}

PERGUNTA DO ALUNO:
${params.question}

Responda de forma clara, didática e completa. Cite artigos de lei quando relevante.`

  return callClaude(prompt, SYSTEM_TUTOR, { maxTokens: 2048 })
}

const SYSTEM_TUTOR = `Você é um tutor jurídico especializado na OAB (1ª fase).
Você possui amplo conhecimento em todas as disciplinas jurídicas cobradas na OAB.
Baseie suas respostas na legislação vigente, jurisprudência do STF/STJ e na doutrina jurídica.
Seja didático, use exemplos práticos e destaque pontos importantes para a prova.
Quando houver contexto jurídico fornecido, utilize-o como base prioritária.
Use formatação markdown para melhorar a legibilidade.`

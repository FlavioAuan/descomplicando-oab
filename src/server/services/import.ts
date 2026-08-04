import { db } from '@/lib/db'
import { exams, examQuestions, importHistory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createServiceClient } from '@/lib/supabase/server'
import { callClaudeJSON } from '@/lib/ai/claude'

export interface ImportedExam {
  examNumber: number
  year: number
  examDate?: string
  pdfUrl?: string
  gabaritoUrl?: string
  questions: Array<{
    number: number
    statement: string
    alternatives: { a: string; b: string; c: string; d: string }
    correctAnswer: string
  }>
}

export interface ParsedQuestion {
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
}

export async function importExamToDatabase(
  examData: ImportedExam,
  importId: string
): Promise<{ examId: string; questionCount: number }> {
  // importId is used for tracking but not stored per-question in this schema
  void importId

  // Check if exam already exists
  const existing = await db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.examNumber, examData.examNumber))
    .limit(1)

  let examId: string

  if (existing.length > 0) {
    examId = existing[0].id
  } else {
    const [insertedExam] = await db
      .insert(exams)
      .values({
        examNumber: examData.examNumber,
        year: examData.year,
        examDate: examData.examDate,
        pdfUrl: examData.pdfUrl,
        gabaritoUrl: examData.gabaritoUrl,
        totalQuestions: examData.questions.length,
        importedAt: new Date(),
      })
      .returning({ id: exams.id })

    examId = insertedExam.id
  }

  // Insert questions
  if (examData.questions.length > 0) {
    await db.insert(examQuestions).values(
      examData.questions.map((q) => ({
        examId,
        number: q.number,
        statement: q.statement,
        alternatives: q.alternatives,
        correctAnswer: q.correctAnswer,
      }))
    ).onConflictDoNothing()
  }

  return { examId, questionCount: examData.questions.length }
}

export async function createImportRecord(params: {
  source: string
  importedBy?: string | null
}): Promise<string> {
  const [record] = await db
    .insert(importHistory)
    .values({
      source: params.source,
      status: 'running',
      // importedBy is a UUID ref to users — null for system/background imports
      startedAt: new Date(),
    })
    .returning({ id: importHistory.id })

  return record.id
}

export async function updateImportRecord(
  id: string,
  data: {
    status: 'completed' | 'failed'
    countExams?: number
    countQuestions?: number
    notes?: string
    errorLog?: string
  }
): Promise<void> {
  await db
    .update(importHistory)
    .set({
      status: data.status,
      countExams: data.countExams,
      countQuestions: data.countQuestions,
      notes: data.notes,
      errorLog: data.errorLog,
      completedAt: new Date(),
    })
    .where(eq(importHistory.id, id))
}

export async function uploadPdfToStorage(
  bucket: string,
  path: string,
  pdfBuffer: Buffer,
  contentType = 'application/pdf'
): Promise<string> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, pdfBuffer, {
      contentType,
      upsert: true,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function getImportHistory() {
  return db.select().from(importHistory).orderBy(importHistory.startedAt)
}

// ─── PDF Text Parsers ─────────────────────────────────────────────────────────

/**
 * Parse OAB exam text extracted from PDF.
 * Handles multiple common FGV formatting patterns.
 */
export function parseExamText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  // Normalise line endings
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // ── Strategy 1: "QUESTÃO N" or "QUESTÃO 0N" heading ────────────────────────
  // Matches: QUESTÃO 1, QUESTÃO 01, Questão 1, etc.
  const qPattern = /(?:QUESTÃO|Questão|QUESTAO|Questao)\s+(\d{1,3})([\s\S]*?)(?=(?:QUESTÃO|Questão|QUESTAO|Questao)\s+\d{1,3}|$)/gi
  let match: RegExpExecArray | null

  while ((match = qPattern.exec(normalised)) !== null) {
    const number = parseInt(match[1], 10)
    const block = match[2].trim()
    const parsed = extractStatementAndAlternatives(block)
    if (parsed) {
      questions.push({ number, ...parsed })
    }
  }

  if (questions.length >= 5) return questions

  // ── Strategy 2: "N -" or "N." heading (FGV older format) ───────────────────
  // Matches lines like: "1 -", "01 -", "1.", "01."
  const qPattern2 = /^(\d{1,3})\s*[-\.]\s*\n([\s\S]*?)(?=^\d{1,3}\s*[-\.]|$)/gm
  const questions2: ParsedQuestion[] = []

  while ((match = qPattern2.exec(normalised)) !== null) {
    const number = parseInt(match[1], 10)
    const block = match[2].trim()
    const parsed = extractStatementAndAlternatives(block)
    if (parsed) {
      questions2.push({ number, ...parsed })
    }
  }

  if (questions2.length >= 5) return questions2

  // ── Strategy 3: Detect "A)" / "(A)" alternatives inline ────────────────────
  const qPattern3 = /^(\d{1,3})\s*[-\.)]\s*([\s\S]*?)(?=^\d{1,3}\s*[-\.]|$)/gm
  const questions3: ParsedQuestion[] = []

  while ((match = qPattern3.exec(normalised)) !== null) {
    const number = parseInt(match[1], 10)
    if (number > 100) continue // sanity check
    const block = match[2].trim()
    const parsed = extractStatementAndAlternatives(block)
    if (parsed) {
      questions3.push({ number, ...parsed })
    }
  }

  if (questions3.length >= 5) return questions3

  return questions
}

/**
 * Extract statement and alternatives from a question block.
 * Supports both "A)" and "(A)" style alternatives.
 */
function extractStatementAndAlternatives(
  block: string
): Omit<ParsedQuestion, 'number'> | null {
  // Try "(A)" style first
  const parenAlt = /^\s*\(([A-D])\)\s*([\s\S]*?)(?=^\s*\([A-D]\)|$)/gm
  // Try "A)" style
  const plainAlt = /^\s*([A-D])\)\s*([\s\S]*?)(?=^\s*[A-D]\)|$)/gm

  let altMatch: RegExpExecArray | null
  const alternatives: Record<string, string> = {}

  // Try paren style
  while ((altMatch = parenAlt.exec(block)) !== null) {
    alternatives[altMatch[1].toLowerCase()] = altMatch[2].trim()
  }

  // If paren style found nothing, try plain style
  if (Object.keys(alternatives).length === 0) {
    while ((altMatch = plainAlt.exec(block)) !== null) {
      alternatives[altMatch[1].toLowerCase()] = altMatch[2].trim()
    }
  }

  if (!alternatives.a) return null

  // Statement = everything before the first alternative
  let statementEnd = block.search(/^\s*\([A-D]\)/m)
  if (statementEnd < 0) statementEnd = block.search(/^\s*[A-D]\)/m)
  const statement = statementEnd > 0
    ? block.substring(0, statementEnd).trim()
    : block.split('\n')[0].trim()

  if (!statement) return null

  return {
    statement,
    alternatives: {
      a: alternatives.a || '',
      b: alternatives.b || '',
      c: alternatives.c || '',
      d: alternatives.d || '',
    },
  }
}

/**
 * Parse gabarito (answer key) text.
 * Handles patterns like: "1. A", "1-A", "01 A", "1)A", "QUESTÃO 1: A"
 */
export function parseGabarito(text: string): Record<number, string> {
  return parseGabaritoText(text)
}

export function parseGabaritoText(text: string): Record<number, string> {
  const answers: Record<number, string> = {}
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Multiple patterns for different gabarito formats
  const patterns = [
    // "QUESTÃO 01: A" or "Questão 1 - A"
    /(?:QUESTÃO|Questão|QUESTAO)\s+(\d{1,3})\s*[:\-]\s*([A-D])/gi,
    // "01. A" or "1. A" or "01 - A" or "01-A"
    /^\s*(\d{1,3})\s*[\.\-\)]\s*([A-D])\b/gm,
    // "01 A" (space-separated, whole line)
    /^\s*(\d{1,3})\s+([A-D])\s*$/gm,
    // "1:A" or "1: A"
    /(\d{1,3})\s*:\s*([A-D])\b/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    pattern.lastIndex = 0
    while ((match = pattern.exec(normalised)) !== null) {
      const num = parseInt(match[1], 10)
      if (num > 0 && num <= 200 && !answers[num]) {
        answers[num] = match[2].toLowerCase()
      }
    }
  }

  return answers
}

// ─── Claude Fallback Parser ───────────────────────────────────────────────────

/**
 * Use Claude to extract questions from PDF text when regex fails.
 * Returns an empty array if ANTHROPIC_API_KEY is not set.
 */
export async function parseExamWithClaude(
  text: string,
  examInfo: string
): Promise<ParsedQuestion[]> {
  if (!process.env.OPENROUTER_API_KEY) return []

  const truncated =
    text.length > 60000 ? text.substring(0, 60000) + '\n[TEXTO TRUNCADO]' : text

  const systemPrompt = `Você é um extrator de questões de provas da OAB (Exame da Ordem dos Advogados do Brasil).
Sua tarefa é analisar o texto bruto extraído de um PDF de prova e retornar TODAS as questões encontradas em formato JSON válido.
Retorne APENAS um array JSON, sem markdown, sem explicações adicionais.`

  const userPrompt = `Extraia todas as questões do seguinte texto de prova OAB (${examInfo}).
Cada questão deve ter: number (inteiro), statement (enunciado completo), alternatives (objeto com a, b, c, d como strings).

Formato de resposta (array JSON):
[{"number":1,"statement":"enunciado...","alternatives":{"a":"texto A","b":"texto B","c":"texto C","d":"texto D"}}]

TEXTO DA PROVA:
${truncated}`

  try {
    const parsed = await callClaudeJSON<
      Array<{
        number: number
        statement: string
        alternatives: { a: string; b: string; c: string; d: string }
      }>
    >(userPrompt, systemPrompt, { maxTokens: 8192 })

    return parsed.map((q) => ({
      number: q.number,
      statement: q.statement || '',
      alternatives: {
        a: q.alternatives?.a || '',
        b: q.alternatives?.b || '',
        c: q.alternatives?.c || '',
        d: q.alternatives?.d || '',
      },
    }))
  } catch {
    return []
  }
}

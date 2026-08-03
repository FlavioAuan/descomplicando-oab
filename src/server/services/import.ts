import { db } from '@/lib/db'
import { exams, examQuestions, importHistory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createServiceClient } from '@/lib/supabase/server'

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

export async function importExamToDatabase(
  examData: ImportedExam,
  importId: string
): Promise<{ examId: string; questionCount: number }> {
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
  importedBy: string
}): Promise<string> {
  const [record] = await db
    .insert(importHistory)
    .values({
      source: params.source,
      status: 'running',
      importedBy: params.importedBy,
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

// Parse OAB exam text extracted from PDF
export function parseExamText(text: string): Array<{
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
}> {
  const questions: Array<{
    number: number
    statement: string
    alternatives: { a: string; b: string; c: string; d: string }
  }> = []

  // Pattern to match question blocks
  const questionPattern = /(?:QUESTÃO|Questão)\s+(\d+)([\s\S]*?)(?=(?:QUESTÃO|Questão)\s+\d+|$)/gi
  const altPattern = /^\s*([A-D])\)\s*([\s\S]*?)(?=^\s*[A-D]\)|$)/gm

  let match
  while ((match = questionPattern.exec(text)) !== null) {
    const number = parseInt(match[1])
    const block = match[2].trim()

    const alternatives: Record<string, string> = {}
    let altMatch
    altPattern.lastIndex = 0

    while ((altMatch = altPattern.exec(block)) !== null) {
      alternatives[altMatch[1].toLowerCase()] = altMatch[2].trim()
    }

    const statementEnd = block.search(/^\s*A\)/m)
    const statement = statementEnd > 0
      ? block.substring(0, statementEnd).trim()
      : block

    if (statement && alternatives.a) {
      questions.push({
        number,
        statement,
        alternatives: {
          a: alternatives.a || '',
          b: alternatives.b || '',
          c: alternatives.c || '',
          d: alternatives.d || '',
        },
      })
    }
  }

  return questions
}

// Parse gabarito text
export function parseGabarito(text: string): Record<number, string> {
  const answers: Record<number, string> = {}

  // Common patterns: "1. A" or "1-A" or "01 A"
  const pattern = /(\d+)[\.\-\s]+([A-D])/g
  let match

  while ((match = pattern.exec(text)) !== null) {
    answers[parseInt(match[1])] = match[2].toLowerCase()
  }

  return answers
}

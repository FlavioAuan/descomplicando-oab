'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, exams, examQuestions, subjects, subsubjects } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { callClaudeJSON } from '@/lib/ai/claude'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
}

export interface ClassifiedQuestion extends ParsedQuestion {
  discipline: string
  subtheme: string
  subjectId?: string
  subsubjectId?: string
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

async function extractPDFText(buffer: Buffer): Promise<string> {
  // pdf-parse has a quirky default export depending on bundler
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('pdf-parse')
  const pdfParse = mod.default ?? mod
  const result = await pdfParse(buffer)
  return result.text as string
}

// ─── AI parsing helpers ───────────────────────────────────────────────────────

async function parseQuestionsChunk(text: string, startHint: number, endHint: number): Promise<ParsedQuestion[]> {
  const prompt = `Parse OAB (Brazilian Bar Exam) questions ${startHint}–${endHint} from this text.

Each question has: a number, a statement (enunciado), and alternatives A, B, C, D.

TEXT:
${text}

Return ONLY a JSON array:
[{"number":${startHint},"statement":"full statement","alternatives":{"a":"...","b":"...","c":"...","d":"..."}}]`

  const result = await callClaudeJSON<ParsedQuestion[]>(
    prompt,
    'You parse Brazilian OAB exam questions accurately. Return only the JSON array, no extra text.',
    { maxTokens: 4096 }
  )
  return Array.isArray(result) ? result : []
}

async function parseGabarito(text: string): Promise<Record<number, string>> {
  const prompt = `Extract the answer key from this OAB gabarito (answer sheet).

TEXT:
${text.substring(0, 3000)}

Return ONLY a JSON object mapping question number to correct answer letter (lowercase a/b/c/d):
{"1":"a","2":"b","3":"c",...}`

  const result = await callClaudeJSON<Record<string, string>>(
    prompt,
    'You parse OAB gabarito tables accurately. Return only the JSON object.',
    { maxTokens: 1024 }
  )
  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries(result ?? {})) {
    out[parseInt(k)] = String(v).toLowerCase().charAt(0)
  }
  return out
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function extractExamFromFiles(formData: FormData): Promise<
  { data: { questions: ParsedQuestion[]; examNumber: number; year: number; examDate: string } } |
  { error: string }
> {
  await requireRole('admin', 'super_admin')

  const examFile = formData.get('examPdf') as File | null
  const gabaritoFile = formData.get('gabaritoPdf') as File | null
  const examNumber = parseInt(formData.get('examNumber') as string)
  const year = parseInt(formData.get('year') as string)
  const examDate = (formData.get('examDate') as string) || ''

  if (!examFile || examFile.size === 0) return { error: 'Envie o PDF da prova.' }
  if (!gabaritoFile || gabaritoFile.size === 0) return { error: 'Envie o PDF do gabarito.' }
  if (isNaN(examNumber) || examNumber < 1) return { error: 'Número da prova inválido.' }
  if (isNaN(year) || year < 1990) return { error: 'Ano inválido.' }

  // Check duplicate
  const existing = await db.select({ id: exams.id }).from(exams)
    .where(and(eq(exams.examNumber, examNumber), eq(exams.year, year))).limit(1)
  if (existing.length > 0) {
    return { error: `Prova OAB ${examNumber} (${year}) já existe no banco de dados.` }
  }

  try {
    const [examBuf, gabaritoBuf] = await Promise.all([
      examFile.arrayBuffer().then(b => Buffer.from(b)),
      gabaritoFile.arrayBuffer().then(b => Buffer.from(b)),
    ])

    const [examText, gabaritoText] = await Promise.all([
      extractPDFText(examBuf),
      extractPDFText(gabaritoBuf),
    ])

    // Split exam text roughly in half to fit in AI context window
    const mid = Math.floor(examText.length / 2)
    // Try to split at a question boundary near the midpoint
    const splitMarker = examText.lastIndexOf('\n', mid + 2000)
    const half1 = examText.slice(0, splitMarker > 0 ? splitMarker : mid)
    const half2 = examText.slice(splitMarker > 0 ? splitMarker : mid)

    const [part1, part2, gabarito] = await Promise.all([
      parseQuestionsChunk(half1, 1, 40),
      parseQuestionsChunk(half2, 41, 80),
      parseGabarito(gabaritoText),
    ])

    const allQuestions = [...part1, ...part2]
      .sort((a, b) => a.number - b.number)
      .map(q => ({
        ...q,
        correctAnswer: gabarito[q.number] || '',
      }))

    if (allQuestions.length === 0) {
      return { error: 'Não foi possível extrair questões do PDF. Verifique se o PDF contém texto selecionável (não é uma imagem).' }
    }

    return { data: { questions: allQuestions, examNumber, year, examDate } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao processar PDFs.' }
  }
}

export async function classifyQuestions(
  questions: ParsedQuestion[]
): Promise<ClassifiedQuestion[]> {
  await requireRole('admin', 'super_admin')

  const allSubjects = await db.select().from(subjects)
  const allSubsubjects = await db.select().from(subsubjects)
  const subjectMap = new Map(allSubjects.map(s => [s.name.toLowerCase().trim(), s.id]))
  const subsubjectMap = new Map(allSubsubjects.map(s => [s.name.toLowerCase().trim(), s.id]))

  const BATCH = 10
  const classified: ClassifiedQuestion[] = []

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH)

    const prompt = `Classify these OAB exam questions by Brazilian legal discipline.

${batch.map(q =>
  `Q${q.number}: ${q.statement.substring(0, 400)}`
).join('\n\n')}

Disciplines: Direito Civil, Direito Constitucional, Direito Penal, Direito Processual Civil, Direito Processual Penal, Direito Administrativo, Direito Tributário, Direito do Trabalho, Direito Empresarial, Direito do Consumidor, Direito Ambiental, Direito Internacional, Direito Previdenciário, Direito Eleitoral, Estatuto da Advocacia e Ética Profissional, Direito da Criança e do Adolescente, Direito Financeiro, Direitos Humanos

Return ONLY a JSON array:
[{"number":${batch[0].number},"discipline":"Direito Civil","subtheme":"Contratos"}]`

    try {
      const results = await callClaudeJSON<{ number: number; discipline: string; subtheme: string }[]>(
        prompt,
        'You classify OAB questions accurately. Return only the JSON array.',
        { maxTokens: 1024 }
      )

      for (const q of batch) {
        const r = Array.isArray(results) ? results.find(x => x.number === q.number) : null
        const discipline = r?.discipline?.trim() || ''
        const subtheme = r?.subtheme?.trim() || ''
        classified.push({
          ...q,
          discipline,
          subtheme,
          subjectId: subjectMap.get(discipline.toLowerCase()) || undefined,
          subsubjectId: subsubjectMap.get(subtheme.toLowerCase()) || undefined,
        })
      }
    } catch {
      batch.forEach(q => classified.push({ ...q, discipline: '', subtheme: '' }))
    }
  }

  return classified
}

export async function saveExam(data: {
  examNumber: number
  year: number
  examDate: string
  questions: ClassifiedQuestion[]
}): Promise<{ data?: { examId: string; count: number }; error?: string }> {
  await requireRole('admin', 'super_admin')

  try {
    const now = new Date()
    const [exam] = await db.insert(exams).values({
      examNumber: data.examNumber,
      year: data.year,
      examDate: data.examDate || undefined,
      phase: '1a fase',
      totalQuestions: data.questions.length,
      isActive: true,
      importedAt: now,
    }).returning()

    const CHUNK = 20
    for (let i = 0; i < data.questions.length; i += CHUNK) {
      const batch = data.questions.slice(i, i + CHUNK)
      await db.insert(examQuestions).values(
        batch.map(q => ({
          examId: exam.id,
          number: q.number,
          statement: q.statement,
          alternatives: q.alternatives,
          correctAnswer: q.correctAnswer || 'a',
          subjectId: q.subjectId || null,
          subsubjectId: q.subsubjectId || null,
          classified: !!q.subjectId,
          classifiedAt: q.subjectId ? new Date() : null,
        }))
      )
    }

    revalidatePath('/admin/exams', 'page')
    revalidatePath('/admin/questions', 'page')
    revalidatePath('/admin/dashboard', 'page')
    revalidatePath('/super-admin/classify', 'page')
    return { data: { examId: exam.id, count: data.questions.length } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao salvar prova.' }
  }
}

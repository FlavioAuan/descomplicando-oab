/**
 * Fix Failed Exams — Phase 1.5
 * Re-processes exams that failed PDF text extraction in phase1-raw.json
 * by extracting PDF text with pdf-parse and sending to OpenRouter AI.
 *
 * Run AFTER import-oab-history.ts completes:
 *   npx tsx scripts/fix-failed-exams.ts
 */

import fs from 'fs'
import path from 'path'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

interface ParsedQuestion {
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
}

interface RawExam {
  number: number
  numeral: string
  year: number
  examDate: string
  provaUrl: string
  gabaritoUrl: string
  questions: ParsedQuestion[]
  parseStrategy: string
}

function log(msg: string) {
  const ts = new Date().toISOString().substring(11, 19)
  console.log(`[${ts}] ${msg}`)
}

function save(filename: string, data: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

function getHeaders(): Record<string, string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')
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

async function callAI(prompt: string, systemPrompt?: string, maxTokens = 8192): Promise<string> {
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${body}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content as string) ?? ''
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/pdf,*/*' },
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>
    const result = await pdfParse(buffer)
    return result.text || ''
  } catch {
    return ''
  }
}

async function extractWithAI(
  provaBuffer: Buffer,
  gabaritoBuffer: Buffer | null,
  examLabel: string
): Promise<ParsedQuestion[]> {
  const provaText = await extractPdfText(provaBuffer)

  let gabaritoInfo = ''
  if (gabaritoBuffer && gabaritoBuffer.length > 500) {
    const gabText = await extractPdfText(gabaritoBuffer)
    if (gabText.length > 50) {
      gabaritoInfo = `\n\nGABARITO OFICIAL:\n${gabText.substring(0, 5000)}`
    }
  }

  const truncated = provaText.length > 50000
    ? provaText.substring(0, 50000) + '\n[TEXTO TRUNCADO]'
    : provaText

  const prompt = `Extraia TODAS as questões da prova OAB ${examLabel}.
Para cada questão retorne:
- number: número da questão (1-80)
- statement: enunciado completo da questão
- alternatives: objeto com as alternativas a, b, c, d
- correctAnswer: letra correta (a/b/c/d) baseado no gabarito, ou "" se não souber

Responda SOMENTE com JSON válido:
[
  {
    "number": 1,
    "statement": "enunciado completo...",
    "alternatives": { "a": "...", "b": "...", "c": "...", "d": "..." },
    "correctAnswer": "a"
  }
]

TEXTO DA PROVA:
${truncated}${gabaritoInfo}`

  const text = await callAI(
    prompt,
    'Você é um extrator de questões de provas da OAB. Responda APENAS com JSON válido, sem texto adicional.',
    16000
  )

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array in response')

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    number: number
    statement: string
    alternatives: { a: string; b: string; c: string; d: string }
    correctAnswer: string
  }>

  return parsed.map(q => ({
    number: q.number,
    statement: q.statement || '',
    alternatives: {
      a: q.alternatives?.a || '',
      b: q.alternatives?.b || '',
      c: q.alternatives?.c || '',
      d: q.alternatives?.d || '',
    },
    correctAnswer: (q.correctAnswer || '').toLowerCase(),
  }))
}

async function fixGabaritosAI(
  exam: RawExam,
  gabaritoBuffer: Buffer
): Promise<Record<number, string>> {
  const gabText = await extractPdfText(gabaritoBuffer)
  if (!gabText) return {}

  const prompt = `Este é o gabarito oficial da prova OAB ${exam.numeral} Exame (${exam.year}).
Extraia a resposta correta de cada questão (1 a 80).

Responda SOMENTE com JSON:
{ "1": "a", "2": "b", "3": "c", ... }

TEXTO DO GABARITO:
${gabText.substring(0, 10000)}`

  const text = await callAI(
    prompt,
    'Extraia as respostas do gabarito. Responda APENAS com JSON válido.',
    4096
  )

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}

  const raw = JSON.parse(jsonMatch[0]) as Record<string, string>
  const answers: Record<number, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const n = parseInt(k, 10)
    if (n > 0 && n <= 80) answers[n] = String(v).toLowerCase()
  }
  return answers
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  // Load phase1 results
  const phase1Path = path.join(DATA_DIR, 'phase1-raw.json')
  if (!fs.existsSync(phase1Path)) throw new Error('phase1-raw.json not found — run import-oab-history.ts first')

  const exams: RawExam[] = JSON.parse(fs.readFileSync(phase1Path, 'utf-8'))

  const failed = exams.filter(e => e.questions.length === 0)
  const hasQbutNoAnswers = exams.filter(e => e.questions.length > 0 && e.questions.every(q => !q.correctAnswer))

  log(`Failed exams (0 questions): ${failed.map(e => e.numeral).join(', ')}`)
  log(`Exams with questions but no answers: ${hasQbutNoAnswers.map(e => e.numeral).join(', ')}`)
  log(`Total to reprocess: ${failed.length + hasQbutNoAnswers.length}`)

  // Fix fully failed exams using AI extraction
  for (const exam of failed) {
    log(`\n[${exam.numeral}] Downloading prova PDF...`)
    const provaBuffer = await fetchBuffer(exam.provaUrl)
    if (!provaBuffer || provaBuffer.length < 1000) {
      log(`[${exam.numeral}] Could not download prova, skipping`)
      continue
    }

    log(`[${exam.numeral}] Downloading gabarito PDF...`)
    const gabBuffer = await fetchBuffer(exam.gabaritoUrl)

    log(`[${exam.numeral}] Sending to AI for extraction (${Math.round(provaBuffer.length / 1024)}KB)...`)
    try {
      const questions = await extractWithAI(provaBuffer, gabBuffer, `${exam.numeral} (${exam.year})`)

      const idx = exams.findIndex(e => e.number === exam.number)
      exams[idx].questions = questions
      exams[idx].parseStrategy = 'ai-text'

      log(`[${exam.numeral}] Extracted ${questions.length} questions`)
      save('phase1-raw.json', exams)
    } catch (err) {
      log(`[${exam.numeral}] AI extraction failed: ${err}`)
    }

    await new Promise(r => setTimeout(r, 3000))
  }

  // Fix exams that have questions but no correct answers
  for (const exam of hasQbutNoAnswers) {
    log(`\n[${exam.numeral}] Re-fetching gabarito for answer extraction...`)
    const gabBuffer = await fetchBuffer(exam.gabaritoUrl)
    if (!gabBuffer || gabBuffer.length < 100) {
      log(`[${exam.numeral}] Could not download gabarito`)
      continue
    }

    try {
      log(`[${exam.numeral}] Sending gabarito to AI...`)
      const answers = await fixGabaritosAI(exam, gabBuffer)

      const idx = exams.findIndex(e => e.number === exam.number)
      let fixed = 0
      for (const q of exams[idx].questions) {
        if (answers[q.number]) {
          q.correctAnswer = answers[q.number]
          fixed++
        }
      }

      log(`[${exam.numeral}] Fixed ${fixed}/${exams[idx].questions.length} correct answers`)
      save('phase1-raw.json', exams)
    } catch (err) {
      log(`[${exam.numeral}] Gabarito fix failed: ${err}`)
    }

    await new Promise(r => setTimeout(r, 2000))
  }

  const totalQ = exams.reduce((s, e) => s + e.questions.length, 0)
  const withAnswers = exams.reduce((s, e) => s + e.questions.filter(q => q.correctAnswer).length, 0)

  log('\n═══════════════════════════════════════════')
  log(`Done! Total: ${totalQ} questions, ${withAnswers} with correct answers`)
  log('Now delete phase2-classified.json and phase3-analysis.json')
  log('and re-run import-oab-history.ts to reclassify everything.')
  log('═══════════════════════════════════════════')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

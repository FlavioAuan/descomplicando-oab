/**
 * Fix Failed Exams — Phase 1.5
 * Re-processes exams that failed PDF text extraction in phase1-raw.json
 * by sending the PDF bytes directly to Claude API (supports PDF input natively).
 *
 * Run AFTER import-oab-history.ts completes:
 *   npx tsx scripts/fix-failed-exams.ts
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')

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

async function extractWithClaude(
  client: Anthropic,
  provaBuffer: Buffer,
  gabaritoBuffer: Buffer | null,
  examLabel: string
): Promise<ParsedQuestion[]> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

  const content: Anthropic.MessageParam['content'] = [
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: provaBuffer.toString('base64'),
      },
      title: `Prova ${examLabel}`,
    } as Anthropic.DocumentBlockParam,
  ]

  let gabaritoInstruction = ''

  if (gabaritoBuffer && gabaritoBuffer.length > 500) {
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: gabaritoBuffer.toString('base64'),
      },
      title: `Gabarito ${examLabel}`,
    } as Anthropic.DocumentBlockParam)
    gabaritoInstruction = `
O SEGUNDO documento é o gabarito oficial. Use-o para preencher o campo "correctAnswer" de cada questão com a letra correta (a, b, c ou d).`
  }

  content.push({
    type: 'text',
    text: `Extraia TODAS as 80 questões da prova OAB ${examLabel} que está no PRIMEIRO documento PDF.${gabaritoInstruction}

Para cada questão retorne:
- number: número da questão (1-80)
- statement: enunciado completo da questão
- alternatives: objeto com as alternativas a, b, c, d
- correctAnswer: letra correta (a/b/c/d) ou "a" se não souber

Responda SOMENTE com JSON válido, sem texto adicional:
[
  {
    "number": 1,
    "statement": "enunciado completo...",
    "alternatives": { "a": "...", "b": "...", "c": "...", "d": "..." },
    "correctAnswer": "a"
  }
]`,
  })

  const msg = await client.messages.create({
    model,
    max_tokens: 16000,
    messages: [{ role: 'user', content }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
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
    correctAnswer: (q.correctAnswer || 'a').toLowerCase(),
  }))
}

async function fixGabaritos(
  client: Anthropic,
  exam: RawExam,
  gabaritoBuffer: Buffer
): Promise<Record<number, string>> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: gabaritoBuffer.toString('base64'),
          },
          title: `Gabarito OAB ${exam.numeral}`,
        } as Anthropic.DocumentBlockParam,
        {
          type: 'text',
          text: `Este é o gabarito oficial da prova OAB ${exam.numeral} Exame (${exam.year}).
Extraia a resposta correta de cada questão (1 a 80).

Responda SOMENTE com JSON:
{ "1": "a", "2": "b", "3": "c", ... }`,
        },
      ],
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })

  // Load phase1 results
  const phase1Path = path.join(DATA_DIR, 'phase1-raw.json')
  if (!fs.existsSync(phase1Path)) throw new Error('phase1-raw.json not found — run import-oab-history.ts first')

  const exams: RawExam[] = JSON.parse(fs.readFileSync(phase1Path, 'utf-8'))

  const failed = exams.filter(e => e.questions.length === 0)
  const hasQbutNoAnswers = exams.filter(e => e.questions.length > 0 && e.questions.every(q => !q.correctAnswer))

  log(`Failed exams (0 questions): ${failed.map(e => e.numeral).join(', ')}`)
  log(`Exams with questions but no answers: ${hasQbutNoAnswers.map(e => e.numeral).join(', ')}`)
  log(`Total to reprocess: ${failed.length + hasQbutNoAnswers.length}`)

  // Fix fully failed exams (0 questions) using Claude PDF extraction
  for (const exam of failed) {
    log(`\n[${exam.numeral}] Downloading prova PDF...`)
    const provaBuffer = await fetchBuffer(exam.provaUrl)
    if (!provaBuffer || provaBuffer.length < 1000) {
      log(`[${exam.numeral}] Could not download prova, skipping`)
      continue
    }

    log(`[${exam.numeral}] Downloading gabarito PDF...`)
    const gabBuffer = await fetchBuffer(exam.gabaritoUrl)

    log(`[${exam.numeral}] Sending to Claude for extraction (${Math.round(provaBuffer.length / 1024)}KB)...`)
    try {
      const questions = await extractWithClaude(client, provaBuffer, gabBuffer, `${exam.numeral} (${exam.year})`)

      const idx = exams.findIndex(e => e.number === exam.number)
      exams[idx].questions = questions
      exams[idx].parseStrategy = 'claude-pdf'

      log(`[${exam.numeral}] Extracted ${questions.length} questions`)
      save('phase1-raw.json', exams)
    } catch (err) {
      log(`[${exam.numeral}] Claude extraction failed: ${err}`)
    }

    // Rate limit — Claude PDF extraction is intensive
    await new Promise(r => setTimeout(r, 3000))
  }

  // Fix exams that have questions but no correct answers — re-parse gabarito via Claude
  for (const exam of hasQbutNoAnswers) {
    log(`\n[${exam.numeral}] Re-fetching gabarito for answer extraction...`)
    const gabBuffer = await fetchBuffer(exam.gabaritoUrl)
    if (!gabBuffer || gabBuffer.length < 100) {
      log(`[${exam.numeral}] Could not download gabarito`)
      continue
    }

    try {
      log(`[${exam.numeral}] Sending gabarito to Claude...`)
      const answers = await fixGabaritos(client, exam, gabBuffer)

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

/**
 * Deletes all exam-related data from Supabase and re-uploads from phase1-raw.json.
 * Run: npx tsx scripts/reset-and-upload.ts
 *
 * Deletes: exam_questions, exams, statistics, predictions, subjects, subsubjects, microtopics
 * Then re-runs phase4 from the import script using data in phase1-raw.json.
 */

import fs from 'fs'
import path from 'path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// ─── Load env ─────────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data')

function log(msg: string) {
  const ts = new Date().toISOString().substring(11, 19)
  console.log(`[${ts}] ${msg}`)
}

function load<T>(filename: string): T | null {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

// ─── Types (same as import-oab-history.ts) ────────────────────────────────────

interface ParsedQuestion {
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
}

interface ClassifiedQuestion extends ParsedQuestion {
  classification?: {
    discipline: string
    subtheme: string
    microtheme: string
  }
}

interface ClassifiedExam {
  number: number
  numeral: string
  year: number
  examDate: string
  provaUrl: string
  gabaritoUrl: string
  questions: ClassifiedQuestion[]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const client = postgres(dbUrl, { prepare: false, max: 5 })

  const schema = await import('../src/lib/db/schema')
  const {
    exams: examsTable,
    examQuestions: examQuestionsTable,
    subjects: subjectsTable,
    subsubjects: subsubjectsTable,
    microtopics: microtopicsTable,
    statistics: statisticsTable,
    predictions: predictionsTable,
  } = schema

  const db = drizzle(client, { schema })
  const { sql } = await import('drizzle-orm') as typeof import('drizzle-orm')

  // ─── Step 1: Delete all existing data ─────────────────────────────────────
  log('Step 1: Deleting all existing exam data...')

  // Delete in dependency order (children first)
  await db.delete(statisticsTable)
  log('  Deleted statistics')

  await db.delete(predictionsTable)
  log('  Deleted predictions')

  await db.delete(examQuestionsTable)
  log('  Deleted exam_questions')

  await db.delete(examsTable)
  log('  Deleted exams')

  await db.delete(microtopicsTable)
  log('  Deleted microtopics')

  await db.delete(subsubjectsTable)
  log('  Deleted subsubjects')

  await db.delete(subjectsTable)
  log('  Deleted subjects')

  log('All data deleted.')

  // ─── Step 2: Load phase1-raw.json ─────────────────────────────────────────
  log('\nStep 2: Loading phase1-raw.json...')
  const rawExams = load<ClassifiedExam[]>('phase1-raw.json')
  if (!rawExams || rawExams.length === 0) {
    throw new Error('phase1-raw.json is empty or missing')
  }
  log(`  Loaded ${rawExams.length} exams, ${rawExams.reduce((s, e) => s + e.questions.length, 0)} questions`)

  // ─── Step 3: Load phase2-classified.json if available ─────────────────────
  log('\nStep 3: Loading classification data...')
  const classified = load<ClassifiedExam[]>('phase2-classified.json')
  const classifiedMap = new Map<string, Map<number, ClassifiedQuestion['classification']>>()

  if (classified) {
    log(`  Found classified data for ${classified.length} exams`)
    for (const exam of classified) {
      const qMap = new Map<number, ClassifiedQuestion['classification']>()
      for (const q of exam.questions) {
        if ((q as ClassifiedQuestion).classification) {
          qMap.set(q.number, (q as ClassifiedQuestion).classification)
        }
      }
      classifiedMap.set(exam.numeral, qMap)
    }
  } else {
    log('  No classified data found — uploading without classifications')
  }

  // Merge classification data into rawExams
  const mergedExams: ClassifiedExam[] = rawExams.map(exam => ({
    ...exam,
    questions: exam.questions.map(q => ({
      ...q,
      classification: classifiedMap.get(exam.numeral)?.get(q.number),
    })),
  }))

  // ─── Step 4: Insert subjects/subsubjects/microtopics ──────────────────────
  log('\nStep 4: Inserting subjects...')

  const SUBJECT_COLORS: Record<string, string> = {
    'Ética Profissional (OAB)': '#8B4513',
    'Direito Constitucional': '#1565C0',
    'Direito Civil': '#2E7D32',
    'Direito Processual Civil': '#388E3C',
    'Direito Penal': '#B71C1C',
    'Direito Processual Penal': '#C62828',
    'Direito do Trabalho': '#F57F17',
    'Direito Processual do Trabalho': '#F9A825',
    'Direito Empresarial': '#4A148C',
    'Direito Tributário': '#006064',
    'Direito Administrativo': '#01579B',
    'Direito Ambiental': '#1B5E20',
    'Direito do Consumidor': '#E65100',
    'Direitos Humanos': '#880E4F',
    'Direito Internacional': '#0D47A1',
    'Direito Previdenciário': '#37474F',
    'Direito Financeiro': '#3E2723',
    'Filosofia do Direito': '#4E342E',
    'Estatuto da Criança e do Adolescente (ECA)': '#AD1457',
  }

  const subjectIdMap = new Map<string, string>()
  const subsubjectIdMap = new Map<string, string>()
  const microtopicIdMap = new Map<string, string>()

  const uniqueSubjects = new Set<string>()
  const subthemeMap = new Map<string, Set<string>>()
  const microthemeMap = new Map<string, Map<string, Set<string>>>()

  for (const exam of mergedExams) {
    for (const q of exam.questions) {
      const cls = q.classification
      if (!cls?.discipline) continue
      uniqueSubjects.add(cls.discipline)
      if (cls.subtheme) {
        const key = `${cls.discipline}::${cls.subtheme}`
        if (!subthemeMap.has(key)) subthemeMap.set(key, new Set())
        if (cls.microtheme) {
          if (!microthemeMap.has(key)) microthemeMap.set(key, new Map())
          microthemeMap.get(key)!.set(cls.microtheme, new Set())
        }
      }
    }
  }

  for (const name of uniqueSubjects) {
    const [ins] = await db.insert(subjectsTable).values({
      name,
      color: SUBJECT_COLORS[name] || '#2563EB',
    }).returning({ id: subjectsTable.id })
    subjectIdMap.set(name, ins.id)
  }
  log(`  Inserted ${subjectIdMap.size} subjects`)

  for (const [key] of subthemeMap) {
    const [discipline, subtheme] = key.split('::')
    const subjectId = subjectIdMap.get(discipline)
    if (!subjectId) continue
    const [ins] = await db.insert(subsubjectsTable).values({
      subjectId,
      name: subtheme,
    }).returning({ id: subsubjectsTable.id })
    subsubjectIdMap.set(key, ins.id)
  }
  log(`  Inserted ${subsubjectIdMap.size} subsubjects`)

  for (const [subKey, microMap] of microthemeMap) {
    const subsubjectId = subsubjectIdMap.get(subKey)
    if (!subsubjectId) continue
    for (const [micro] of microMap) {
      const mKey = `${subKey}::${micro}`
      const [ins] = await db.insert(microtopicsTable).values({
        subsubjectId,
        name: micro,
      }).returning({ id: microtopicsTable.id })
      microtopicIdMap.set(mKey, ins.id)
    }
  }
  log(`  Inserted ${microtopicIdMap.size} microtopics`)

  // ─── Step 5: Insert exams and questions ───────────────────────────────────
  log('\nStep 5: Inserting exams and questions...')

  const CHUNK = 20
  let totalInserted = 0

  for (const exam of mergedExams) {
    if (exam.questions.length === 0) {
      log(`  [${exam.numeral}] Skipping — no questions`)
      continue
    }

    const [ins] = await db.insert(examsTable).values({
      examNumber: exam.number,
      year: exam.year,
      examDate: exam.examDate,
      phase: '1a fase',
      totalQuestions: exam.questions.length,
      pdfUrl: exam.provaUrl,
      gabaritoUrl: exam.gabaritoUrl,
      importedAt: new Date(),
    }).returning({ id: examsTable.id })
    const examId = ins.id

    for (let i = 0; i < exam.questions.length; i += CHUNK) {
      const chunk = exam.questions.slice(i, i + CHUNK)
      await db.insert(examQuestionsTable).values(
        chunk.map(q => {
          const cls = q.classification
          const subjectId = cls?.discipline ? subjectIdMap.get(cls.discipline) : undefined
          const subsubjectId = cls?.subtheme ? subsubjectIdMap.get(`${cls.discipline}::${cls.subtheme}`) : undefined
          const microtopicId = cls?.microtheme ? microtopicIdMap.get(`${cls.discipline}::${cls.subtheme}::${cls.microtheme}`) : undefined

          return {
            examId,
            number: q.number,
            statement: q.statement,
            alternatives: q.alternatives,
            correctAnswer: q.correctAnswer ?? '',
            subjectId,
            subsubjectId,
            microtopicId,
            classified: !!cls?.discipline,
            classifiedAt: cls?.discipline ? new Date() : undefined,
          }
        })
      )
    }

    log(`  [${exam.numeral}] Inserted ${exam.questions.length} questions`)
    totalInserted += exam.questions.length
  }

  log(`\nTotal questions inserted: ${totalInserted}`)

  // ─── Step 6: Insert statistics if phase3 data exists ──────────────────────
  const phase3Data = load<{ stats: unknown[]; predictions: unknown[] }>('phase3-analysis.json')

  if (phase3Data?.stats && phase3Data.stats.length > 0) {
    log('\nStep 6: Inserting statistics...')

    interface Stat {
      name: string
      totalQuestions: number
      percentageHistorical: number
      avgPerExam: number
      trend: string
      presenceInExams: number
      totalExams: number
    }

    for (const stat of phase3Data.stats as Stat[]) {
      const subjectId = subjectIdMap.get(stat.name)
      if (!subjectId) continue
      await db.insert(statisticsTable).values({
        subjectId,
        totalQuestions: stat.totalQuestions,
        percentageHistorical: stat.percentageHistorical,
        avgPerExam: stat.avgPerExam,
        trend: stat.trend as 'growing' | 'stable' | 'declining',
        presenceInExams: stat.presenceInExams,
        totalExams: stat.totalExams,
        lastCalculated: new Date(),
      }).onConflictDoNothing()
    }
    log(`  Inserted ${(phase3Data.stats as unknown[]).length} statistics`)
  }

  await client.end()
  log('\nDone! Database reset and repopulated successfully.')
  log(`  Exams: ${mergedExams.length}`)
  log(`  Questions: ${totalInserted}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

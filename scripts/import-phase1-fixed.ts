/**
 * Imports phase1-fixed.json into the database.
 * Deletes all existing exam/question/subject data first, then re-inserts.
 * Run: npx tsx scripts/import-phase1-fixed.ts
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

// ─── Exam URLs ────────────────────────────────────────────────────────────────

const EXAM_URLS: Record<string, { provaUrl: string; gabaritoUrl: string }> = {
  'I':      { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/i/prova-i-primeira-fase.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/i/prova-i-primeira-fase-gabarito.pdf' },
  'II':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ii/fgv-2010-oab-exame-de-ordem-unificado-ii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ii/fgv-2010-oab-exame-de-ordem-unificado-ii-primeira-fase-gabarito.pdf' },
  'III':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iii/fgv-2011-oab-exame-de-ordem-unificado-iii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iii/fgv-2011-oab-exame-de-ordem-unificado-iii-primeira-fase-gabarito.pdf' },
  'IV':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iv/fgv-2011-oab-exame-de-ordem-unificado-iv-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iv/fgv-2011-oab-exame-de-ordem-unificado-iv-primeira-fase-gabarito.pdf' },
  'V':      { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/v/fgv-2011-oab-exame-de-ordem-unificado-v-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/v/fgv-2011-oab-exame-de-ordem-unificado-v-primeira-fase-gabarito.pdf' },
  'VI':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vi/fgv-2012-oab-exame-de-ordem-unificado-vi-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vi/fgv-2012-oab-exame-de-ordem-unificado-vi-primeira-fase-gabarito.pdf' },
  'VII':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vii/VII_1_caderno_branca.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vii/gabarito-fgv-oab-cargo-primeira-fase-ano-2012.pdf' },
  'VIII':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/viii/fgv-2012-oab-exame-de-ordem-unificado-viii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/viii/fgv-2012-oab-exame-de-ordem-unificado-viii-primeira-fase-gabarito.pdf' },
  'IX':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ix/fgv-2012-oab-exame-de-ordem-unificado-ix-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ix/fgv-2012-oab-exame-de-ordem-unificado-ix-primeira-fase-gabarito.pdf' },
  'X':      { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/x/fgv-2013-oab-exame-de-ordem-unificado-x-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/x/fgv-2013-oab-exame-de-ordem-unificado-x-primeira-fase-gabarito.pdf' },
  'XI':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xi/fgv-2013-oab-exame-de-ordem-unificado-xi-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xi/fgv-2013-oab-exame-de-ordem-unificado-xi-primeira-fase-gabarito.pdf' },
  'XII':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xii/fgv-2013-oab-exame-de-ordem-unificado-xii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xii/fgv-2013-oab-exame-de-ordem-unificado-xii-primeira-fase-gabarito.pdf' },
  'XIII':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiii/fgv-2014-oab-exame-de-ordem-unificado-xiii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiii/fgv-2014-oab-exame-de-ordem-unificado-xiii-primeira-fase-gabarito.pdf' },
  'XIV':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiv/fgv-2014-oab-exame-de-ordem-unificado-xiv-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiv/fgv-2014-oab-exame-de-ordem-unificado-xiv-primeira-fase-gabarito.pdf' },
  'XV':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xv/fgv-2014-oab-exame-de-ordem-unificado-xv-tipo-1-branca-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xv/fgv-2014-oab-exame-de-ordem-unificado-xv-tipo-1-branca-gabarito.pdf' },
  'XVI':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvi/fgv-2015-oab-exame-de-ordem-unificado-xvi-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvi/fgv-2015-oab-exame-de-ordem-unificado-xvi-primeira-fase-gabarito.pdf' },
  'XVII':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvii/fgv-2015-oab-exame-de-ordem-unificado-xvii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvii/fgv-2015-oab-exame-de-ordem-unificado-xvii-primeira-fase-gabarito.pdf' },
  'XVIII':  { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xviii/fgv-2015-oab-exame-de-ordem-unificado-xviii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xviii/fgv-2015-oab-exame-de-ordem-unificado-xviii-primeira-fase-gabarito.pdf' },
  'XIX':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xix/fgv-2016-oab-exame-de-ordem-unificado-xix-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xix/fgv-2016-oab-exame-de-ordem-unificado-xix-primeira-fase-gabarito.pdf' },
  'XX':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xx/fgv-2016-oab-exame-de-ordem-unificado-xx-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xx/fgv-2016-oab-exame-de-ordem-unificado-xx-primeira-fase-gabarito.pdf' },
  'XXI':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxi/fgv-2016-oab-exame-de-ordem-unificado-xxi-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxi/fgv-2016-oab-exame-de-ordem-unificado-xxi-primeira-fase-gabarito.pdf' },
  'XXII':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxii/fgv-2017-oab-exame-de-ordem-unificado-xxii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxii/fgv-2017-oab-exame-de-ordem-unificado-xxii-primeira-fase-gabarito.pdf' },
  'XXIII':  { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiii/fgv-2017-oab-exame-de-ordem-unificado-xxiii-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiii/fgv-2017-oab-exame-de-ordem-unificado-xxiii-primeira-fase-gabarito.pdf' },
  'XXIV':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiv/fgv-2017-oab-exame-de-ordem-unificado-xxiv-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiv/fgv-2017-oab-exame-de-ordem-unificado-xxiv-primeira-fase-gabarito.pdf' },
  'XXV':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxv/fgv-2018-oab-exame-de-ordem-unificado-xxv-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxv/fgv-2018-oab-exame-de-ordem-unificado-xxv-primeira-fase-gabarito.pdf' },
  'XXVI':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvi/fgv-2018-oab-exame-de-ordem-unificado-xxvi-primeira-fase-prova.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvi/fgv-2018-oab-exame-de-ordem-unificado-xxvi-primeira-fase-gabarito.pdf' },
  'XXVII':  { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvii/prova-xxvii-primeira-fase.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvii/prova-xxvii-primeira-fase-gabarito.pdf' },
  'XXVIII': { provaUrl: 'https://dpmzos25m8ivg.cloudfront.net/631/1338368_CADERNO_TIPO_1_XXVIII_EXAME%20-%20ENVIO.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxviii/prova-xxviii-gabarito.pdf' },
  'XXIX':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxix/prova-xxix.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxix/prova-xxix-gabarito.pdf' },
  'XXX':    { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxx/provaxxx.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxx/gabaritoxxx.pdf' },
  'XXXI':   { provaUrl: 'https://uploads-trilhante-sp.s3-sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxi/provaxxx1.pdf', gabaritoUrl: 'https://uploads-trilhante-sp.s3-sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxi/gabaritoxxxi.pdf' },
  'XXXII':  { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxii/prova%20xxxii.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxii/gabarito%20xxxii.pdf' },
  'XXXIII': { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxiii/prova-xxxiii.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxiii/prova-xxxiii-gabarito.pdf' },
  'XXXIV':  { provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxiv/provaxxxiv.pdf', gabaritoUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxiv/gabarito.pdf' },
  'XXXV':   { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxv/prova-xxxv.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxv/prova-xxxv-gabarito.pdf' },
  'XXXVI':  { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvi/prova-xxxvi.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvi/prova-xxxvi-gabarito.pdf' },
  'XXXVII': { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvii/prova-xxxvii.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvii/prova-xxxvii-gabarito.pdf' },
  'XXXVIII':{ provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxviii/prova-xviii.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxviii/prova-xviii-gabarito.pdf' },
  'XXXIX':  { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxix/prova-xxxix.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxix/prova-xxxix-gabarito.pdf' },
  'XL':     { provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xl/prova-fgv-xl.pdf', gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xl/OABXL%20Gabaritos%20para%20publicação.pdf' },
  'XLI':    { provaUrl: 'https://uploads-trilhante-sp.s3.amazonaws.com/oab/oab-1-fase/provas-antigas/xli/prova-fgv-xli.pdf', gabaritoUrl: 'https://uploads-trilhante-sp.s3.amazonaws.com/oab/oab-1-fase/provas-antigas/xli/prova-xli-gabarito-preliminar.pdf' },
  'XLII':   { provaUrl: 'https://oab.fgv.br/arq/645/402439_OAB%2042%20-%20ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf', gabaritoUrl: 'https://oab.fgv.br/arq/645/273585_OAB42%20Gabaritos%20para%20publicação%20-%20V20241203%20(003).pdf' },
  'XLIII':  { provaUrl: 'https://oab.fgv.br/arq/646/838452_ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf', gabaritoUrl: 'https://oab.fgv.br/arq/646/194143_oab251_gabarito_definitivo_ms.pdf' },
  'XLIV':   { provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xliv/prova-objetiva-xliv-oab.pdf', gabaritoUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xliv/gabarito-objetiva-xliv-oab.pdf' },
  'XLV':    { provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xlv/exame_oab_45.pdf', gabaritoUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xlv/exame_oab_45_gabarito.pdf' },
  'XLVI':   { provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xlvi/exame_oab_46.pdf', gabaritoUrl: 'https://s.oab.org.br/arquivos/2026/05/0662d6ed-01a3-4ee5-905f-a6704d72992b.pdf' },
}

const SUBJECT_COLORS: Record<string, string> = {
  'Estatuto da Advocacia e Ética Profissional': '#8B4513',
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
  'Filosofia do Direito e Teoria Geral do Direito': '#4E342E',
  'Direito Internacional e Direitos Humanos': '#0D47A1',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixedQuestion {
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
  discipline: string
  tema: string
  microtema: string
}

interface FixedExam {
  number: number
  numeral: string
  year: number
  examDate: string
  questions: FixedQuestion[]
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
    simulationQuestions: simulationQuestionsTable,
    studentSimulations: studentSimulationsTable,
    simulations: simulationsTable,
    studentAnswers: studentAnswersTable,
    errorNotebook: errorNotebookTable,
    flashcards: flashcardsTable,
    videos: videosTable,
    knowledgeChunks: knowledgeChunksTable,
    knowledgeFiles: knowledgeFilesTable,
    apostilas: apostilasTable,
    trainingTopics: trainingTopicsTable,
  } = schema
  const db = drizzle(client, { schema })

  // ─── Step 1: Load data ───────────────────────────────────────────────────────
  log('Step 1: Loading phase1-fixed.json...')
  const fixedPath = path.join(DATA_DIR, 'phase1-fixed.json')
  if (!fs.existsSync(fixedPath)) throw new Error('phase1-fixed.json not found')
  const allExams: FixedExam[] = JSON.parse(fs.readFileSync(fixedPath, 'utf-8'))
  const totalQ = allExams.reduce((s, e) => s + e.questions.length, 0)
  log(`  Loaded ${allExams.length} exams, ${totalQ} questions total`)

  // ─── Step 2: Delete all existing data (children before parents) ─────────────
  log('\nStep 2: Deleting all existing data...')
  // Leaf tables first
  await db.delete(errorNotebookTable)
  await db.delete(studentAnswersTable)
  await db.delete(simulationQuestionsTable)
  await db.delete(studentSimulationsTable)
  await db.delete(statisticsTable)
  await db.delete(predictionsTable)
  await db.delete(knowledgeChunksTable)
  await db.delete(apostilasTable)
  await db.delete(trainingTopicsTable)
  // Mid-level
  await db.delete(simulationsTable)
  await db.delete(flashcardsTable)
  await db.delete(videosTable)
  await db.delete(knowledgeFilesTable)
  await db.delete(examQuestionsTable)
  await db.delete(examsTable)
  await db.delete(microtopicsTable)
  await db.delete(subsubjectsTable)
  await db.delete(subjectsTable)
  log('  All data cleared.')

  // ─── Step 3: Collect unique subjects/subsubjects/microtopics ────────────────
  log('\nStep 3: Collecting classification hierarchy...')

  const subjectNames = new Set<string>()
  // subsubjectKey = "discipline::tema"
  const subsubjectKeys = new Set<string>()
  // microtopicKey = "discipline::tema::microtema"
  const microtopicKeys = new Set<string>()

  for (const exam of allExams) {
    for (const q of exam.questions) {
      if (!q.discipline || q.discipline === 'Não classificada') continue
      subjectNames.add(q.discipline)
      if (q.tema) {
        subsubjectKeys.add(`${q.discipline}::${q.tema}`)
        if (q.microtema) {
          microtopicKeys.add(`${q.discipline}::${q.tema}::${q.microtema}`)
        }
      }
    }
  }

  log(`  Subjects: ${subjectNames.size}, Subsubjects: ${subsubjectKeys.size}, Microtopics: ${microtopicKeys.size}`)

  // ─── Step 4: Insert subjects ─────────────────────────────────────────────────
  log('\nStep 4: Inserting subjects...')
  const subjectIdMap = new Map<string, string>()
  for (const name of subjectNames) {
    const [ins] = await db.insert(subjectsTable).values({
      name,
      color: SUBJECT_COLORS[name] || '#2563EB',
    }).returning({ id: subjectsTable.id })
    subjectIdMap.set(name, ins.id)
  }
  log(`  Inserted ${subjectIdMap.size} subjects`)

  // ─── Step 5: Insert subsubjects ──────────────────────────────────────────────
  log('\nStep 5: Inserting subsubjects (temas)...')
  const subsubjectIdMap = new Map<string, string>()
  for (const key of subsubjectKeys) {
    const [discipline, tema] = key.split('::')
    const subjectId = subjectIdMap.get(discipline)
    if (!subjectId) continue
    const [ins] = await db.insert(subsubjectsTable).values({
      subjectId,
      name: tema,
    }).returning({ id: subsubjectsTable.id })
    subsubjectIdMap.set(key, ins.id)
  }
  log(`  Inserted ${subsubjectIdMap.size} subsubjects`)

  // ─── Step 6: Insert microtopics ──────────────────────────────────────────────
  log('\nStep 6: Inserting microtopics...')
  const microtopicIdMap = new Map<string, string>()
  for (const key of microtopicKeys) {
    const parts = key.split('::')
    const discipline = parts[0]
    const tema = parts[1]
    const microtema = parts[2]
    const subsubjectId = subsubjectIdMap.get(`${discipline}::${tema}`)
    if (!subsubjectId) continue
    const [ins] = await db.insert(microtopicsTable).values({
      subsubjectId,
      name: microtema,
    }).returning({ id: microtopicsTable.id })
    microtopicIdMap.set(key, ins.id)
  }
  log(`  Inserted ${microtopicIdMap.size} microtopics`)

  // ─── Step 7: Insert exams and questions ──────────────────────────────────────
  log('\nStep 7: Inserting exams and questions...')
  const CHUNK = 20
  let totalInserted = 0
  let skippedExams = 0

  for (const exam of allExams) {
    const withText = exam.questions.filter(q => q.statement && q.statement.trim().length > 0)
    if (withText.length === 0) {
      log(`  [${exam.numeral}] Skipping — no questions with text`)
      skippedExams++
      continue
    }

    const urls = EXAM_URLS[exam.numeral] || {}
    const [ins] = await db.insert(examsTable).values({
      examNumber: exam.number,
      year: exam.year,
      examDate: exam.examDate || null,
      phase: '1a fase',
      totalQuestions: withText.length,
      pdfUrl: urls.provaUrl || null,
      gabaritoUrl: urls.gabaritoUrl || null,
      importedAt: new Date(),
    }).returning({ id: examsTable.id })
    const examId = ins.id

    for (let i = 0; i < withText.length; i += CHUNK) {
      const chunk = withText.slice(i, i + CHUNK)
      await db.insert(examQuestionsTable).values(
        chunk.map(q => {
          const classified = !!(q.discipline && q.discipline !== 'Não classificada')
          const subjectId = classified ? subjectIdMap.get(q.discipline) : undefined
          const subsubjectId = (classified && q.tema)
            ? subsubjectIdMap.get(`${q.discipline}::${q.tema}`)
            : undefined
          const microtopicId = (classified && q.tema && q.microtema)
            ? microtopicIdMap.get(`${q.discipline}::${q.tema}::${q.microtema}`)
            : undefined

          return {
            examId,
            number: q.number,
            statement: q.statement,
            alternatives: q.alternatives,
            correctAnswer: q.correctAnswer || '',
            subjectId,
            subsubjectId,
            microtopicId,
            classified,
            classifiedAt: classified ? new Date() : undefined,
          }
        })
      )
    }

    log(`  [${exam.numeral}] ${exam.year} — ${withText.length} questions`)
    totalInserted += withText.length
  }

  await client.end()

  log('\n─────────────────────────────────────────────')
  log(`Done!`)
  log(`  Exams imported: ${allExams.length - skippedExams} (${skippedExams} skipped — no text)`)
  log(`  Questions inserted: ${totalInserted}`)
  log(`  Subjects: ${subjectIdMap.size}`)
  log(`  Subsubjects (temas): ${subsubjectIdMap.size}`)
  log(`  Microtopics: ${microtopicIdMap.size}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

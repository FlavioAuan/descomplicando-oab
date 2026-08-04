/**
 * OAB Historical Import Script
 * Downloads all 46 OAB 1ª Fase exams from Trilhante, parses questions,
 * classifies with Claude AI, computes statistics/predictions and seeds the DB.
 *
 * Run: npx tsx scripts/import-oab-history.ts
 *
 * Phases (each saves intermediate JSON so the script can be resumed):
 *   1. Download PDFs + extract text + parse questions → data/phase1-raw.json
 *   2. Classify all questions with Claude           → data/phase2-classified.json
 *   3. Compute statistics + predictions              → data/phase3-analysis.json
 *   4. Seed Supabase/Postgres database               → done
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
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
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamCatalog {
  number: number
  numeral: string
  year: number
  semester: 1 | 2
  examDate: string
  provaUrl: string
  gabaritoUrl: string
}

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

interface Classification {
  discipline: string
  subtheme: string
  microtheme: string
}

interface ClassifiedQuestion extends ParsedQuestion {
  classification: Classification
}

interface ClassifiedExam extends RawExam {
  questions: ClassifiedQuestion[]
}

interface SubjectStat {
  name: string
  totalQuestions: number
  presenceInExams: number
  totalExams: number
  avgPerExam: number
  percentageHistorical: number
  trend: 'growing' | 'stable' | 'declining'
  recentCount: number
  oldCount: number
  subthemes: Record<string, {
    totalQuestions: number
    presenceInExams: number
    microthemes: Record<string, { totalQuestions: number; presenceInExams: number }>
  }>
}

interface Prediction {
  rank: number
  discipline: string
  subtheme: string
  microtheme: string
  probability: number
  frequencyHistorical: number
  frequencyRecent: number
  trend: 'growing' | 'stable' | 'declining'
  justification: string
}

// ─── Exam Catalog ─────────────────────────────────────────────────────────────

const EXAM_CATALOG: ExamCatalog[] = [
  { number: 1,  numeral: 'I',       year: 2010, semester: 1, examDate: '2010-04-18',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/i/prova-i-primeira-fase.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/i/prova-i-primeira-fase-gabarito.pdf' },
  { number: 2,  numeral: 'II',      year: 2010, semester: 2, examDate: '2010-10-10',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ii/fgv-2010-oab-exame-de-ordem-unificado-ii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ii/fgv-2010-oab-exame-de-ordem-unificado-ii-primeira-fase-gabarito.pdf' },
  { number: 3,  numeral: 'III',     year: 2011, semester: 1, examDate: '2011-04-10',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iii/fgv-2011-oab-exame-de-ordem-unificado-iii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iii/fgv-2011-oab-exame-de-ordem-unificado-iii-primeira-fase-gabarito.pdf' },
  { number: 4,  numeral: 'IV',      year: 2011, semester: 2, examDate: '2011-08-21',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iv/fgv-2011-oab-exame-de-ordem-unificado-iv-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/iv/fgv-2011-oab-exame-de-ordem-unificado-iv-primeira-fase-gabarito.pdf' },
  { number: 5,  numeral: 'V',       year: 2011, semester: 2, examDate: '2011-12-18',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/v/fgv-2011-oab-exame-de-ordem-unificado-v-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/v/fgv-2011-oab-exame-de-ordem-unificado-v-primeira-fase-gabarito.pdf' },
  { number: 6,  numeral: 'VI',      year: 2012, semester: 1, examDate: '2012-04-22',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vi/fgv-2012-oab-exame-de-ordem-unificado-vi-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vi/fgv-2012-oab-exame-de-ordem-unificado-vi-primeira-fase-gabarito.pdf' },
  { number: 7,  numeral: 'VII',     year: 2012, semester: 2, examDate: '2012-08-26',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vii/VII_1_caderno_branca.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/vii/gabarito-fgv-oab-cargo-primeira-fase-ano-2012.pdf' },
  { number: 8,  numeral: 'VIII',    year: 2012, semester: 2, examDate: '2012-12-09',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/viii/fgv-2012-oab-exame-de-ordem-unificado-viii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/viii/fgv-2012-oab-exame-de-ordem-unificado-viii-primeira-fase-gabarito.pdf' },
  { number: 9,  numeral: 'IX',      year: 2012, semester: 2, examDate: '2012-12-16',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ix/fgv-2012-oab-exame-de-ordem-unificado-ix-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/ix/fgv-2012-oab-exame-de-ordem-unificado-ix-primeira-fase-gabarito.pdf' },
  { number: 10, numeral: 'X',       year: 2013, semester: 1, examDate: '2013-04-21',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/x/fgv-2013-oab-exame-de-ordem-unificado-x-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/x/fgv-2013-oab-exame-de-ordem-unificado-x-primeira-fase-gabarito.pdf' },
  { number: 11, numeral: 'XI',      year: 2013, semester: 2, examDate: '2013-08-25',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xi/fgv-2013-oab-exame-de-ordem-unificado-xi-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xi/fgv-2013-oab-exame-de-ordem-unificado-xi-primeira-fase-gabarito.pdf' },
  { number: 12, numeral: 'XII',     year: 2013, semester: 2, examDate: '2013-12-08',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xii/fgv-2013-oab-exame-de-ordem-unificado-xii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xii/fgv-2013-oab-exame-de-ordem-unificado-xii-primeira-fase-gabarito.pdf' },
  { number: 13, numeral: 'XIII',    year: 2014, semester: 1, examDate: '2014-04-27',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiii/fgv-2014-oab-exame-de-ordem-unificado-xiii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiii/fgv-2014-oab-exame-de-ordem-unificado-xiii-primeira-fase-gabarito.pdf' },
  { number: 14, numeral: 'XIV',     year: 2014, semester: 2, examDate: '2014-08-24',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiv/fgv-2014-oab-exame-de-ordem-unificado-xiv-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xiv/fgv-2014-oab-exame-de-ordem-unificado-xiv-primeira-fase-gabarito.pdf' },
  { number: 15, numeral: 'XV',      year: 2014, semester: 2, examDate: '2014-12-07',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xv/fgv-2014-oab-exame-de-ordem-unificado-xv-tipo-1-branca-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xv/fgv-2014-oab-exame-de-ordem-unificado-xv-tipo-1-branca-gabarito.pdf' },
  { number: 16, numeral: 'XVI',     year: 2015, semester: 1, examDate: '2015-04-26',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvi/fgv-2015-oab-exame-de-ordem-unificado-xvi-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvi/fgv-2015-oab-exame-de-ordem-unificado-xvi-primeira-fase-gabarito.pdf' },
  { number: 17, numeral: 'XVII',    year: 2015, semester: 2, examDate: '2015-08-23',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvii/fgv-2015-oab-exame-de-ordem-unificado-xvii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xvii/fgv-2015-oab-exame-de-ordem-unificado-xvii-primeira-fase-gabarito.pdf' },
  { number: 18, numeral: 'XVIII',   year: 2015, semester: 2, examDate: '2015-12-13',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xviii/fgv-2015-oab-exame-de-ordem-unificado-xviii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xviii/fgv-2015-oab-exame-de-ordem-unificado-xviii-primeira-fase-gabarito.pdf' },
  { number: 19, numeral: 'XIX',     year: 2016, semester: 1, examDate: '2016-04-24',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xix/fgv-2016-oab-exame-de-ordem-unificado-xix-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xix/fgv-2016-oab-exame-de-ordem-unificado-xix-primeira-fase-gabarito.pdf' },
  { number: 20, numeral: 'XX',      year: 2016, semester: 2, examDate: '2016-08-21',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xx/fgv-2016-oab-exame-de-ordem-unificado-xx-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xx/fgv-2016-oab-exame-de-ordem-unificado-xx-primeira-fase-gabarito.pdf' },
  { number: 21, numeral: 'XXI',     year: 2016, semester: 2, examDate: '2016-12-11',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxi/fgv-2016-oab-exame-de-ordem-unificado-xxi-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxi/fgv-2016-oab-exame-de-ordem-unificado-xxi-primeira-fase-gabarito.pdf' },
  { number: 22, numeral: 'XXII',    year: 2017, semester: 1, examDate: '2017-04-23',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxii/fgv-2017-oab-exame-de-ordem-unificado-xxii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxii/fgv-2017-oab-exame-de-ordem-unificado-xxii-primeira-fase-gabarito.pdf' },
  { number: 23, numeral: 'XXIII',   year: 2017, semester: 2, examDate: '2017-08-27',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiii/fgv-2017-oab-exame-de-ordem-unificado-xxiii-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiii/fgv-2017-oab-exame-de-ordem-unificado-xxiii-primeira-fase-gabarito.pdf' },
  { number: 24, numeral: 'XXIV',    year: 2017, semester: 2, examDate: '2017-12-10',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiv/fgv-2017-oab-exame-de-ordem-unificado-xxiv-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxiv/fgv-2017-oab-exame-de-ordem-unificado-xxiv-primeira-fase-gabarito.pdf' },
  { number: 25, numeral: 'XXV',     year: 2018, semester: 1, examDate: '2018-04-22',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxv/fgv-2018-oab-exame-de-ordem-unificado-xxv-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxv/fgv-2018-oab-exame-de-ordem-unificado-xxv-primeira-fase-gabarito.pdf' },
  { number: 26, numeral: 'XXVI',    year: 2018, semester: 2, examDate: '2018-08-19',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvi/fgv-2018-oab-exame-de-ordem-unificado-xxvi-primeira-fase-prova.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvi/fgv-2018-oab-exame-de-ordem-unificado-xxvi-primeira-fase-gabarito.pdf' },
  { number: 27, numeral: 'XXVII',   year: 2018, semester: 2, examDate: '2018-12-09',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvii/prova-xxvii-primeira-fase.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxvii/prova-xxvii-primeira-fase-gabarito.pdf' },
  { number: 28, numeral: 'XXVIII',  year: 2019, semester: 1, examDate: '2019-04-28',
    provaUrl: 'https://dpmzos25m8ivg.cloudfront.net/631/1338368_CADERNO_TIPO_1_XXVIII_EXAME%20-%20ENVIO.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxviii/prova-xxviii-gabarito.pdf' },
  { number: 29, numeral: 'XXIX',    year: 2019, semester: 2, examDate: '2019-08-25',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxix/prova-xxix.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxix/prova-xxix-gabarito.pdf' },
  { number: 30, numeral: 'XXX',     year: 2019, semester: 2, examDate: '2019-12-08',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxx/provaxxx.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxx/gabaritoxxx.pdf' },
  { number: 31, numeral: 'XXXI',    year: 2020, semester: 1, examDate: '2020-10-25',
    provaUrl: 'https://uploads-trilhante-sp.s3-sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxi/provaxxx1.pdf',
    gabaritoUrl: 'https://uploads-trilhante-sp.s3-sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxi/gabaritoxxxi.pdf' },
  { number: 32, numeral: 'XXXII',   year: 2021, semester: 1, examDate: '2021-05-02',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxii/prova%20xxxii.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxii/gabarito%20xxxii.pdf' },
  { number: 33, numeral: 'XXXIII',  year: 2021, semester: 2, examDate: '2021-08-22',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxiii/prova-xxxiii.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxiii/prova-xxxiii-gabarito.pdf' },
  { number: 34, numeral: 'XXXIV',   year: 2022, semester: 1, examDate: '2022-04-24',
    provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxiv/provaxxxiv.pdf',
    gabaritoUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xxxiv/gabarito.pdf' },
  { number: 35, numeral: 'XXXV',    year: 2022, semester: 2, examDate: '2022-08-21',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxv/prova-xxxv.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxv/prova-xxxv-gabarito.pdf' },
  { number: 36, numeral: 'XXXVI',   year: 2022, semester: 2, examDate: '2022-12-11',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvi/prova-xxxvi.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvi/prova-xxxvi-gabarito.pdf' },
  { number: 37, numeral: 'XXXVII',  year: 2023, semester: 1, examDate: '2023-04-23',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvii/prova-xxxvii.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxvii/prova-xxxvii-gabarito.pdf' },
  { number: 38, numeral: 'XXXVIII', year: 2023, semester: 2, examDate: '2023-08-20',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxviii/prova-xviii.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxviii/prova-xviii-gabarito.pdf' },
  { number: 39, numeral: 'XXXIX',   year: 2023, semester: 2, examDate: '2023-12-10',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxix/prova-xxxix.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxxix/prova-xxxix-gabarito.pdf' },
  { number: 40, numeral: 'XL',      year: 2024, semester: 1, examDate: '2024-04-28',
    provaUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xl/prova-fgv-xl.pdf',
    gabaritoUrl: 'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xl/OABXL%20Gabaritos%20para%20publicação.pdf' },
  { number: 41, numeral: 'XLI',     year: 2024, semester: 2, examDate: '2024-08-25',
    provaUrl: 'https://uploads-trilhante-sp.s3.amazonaws.com/oab/oab-1-fase/provas-antigas/xli/prova-fgv-xli.pdf',
    gabaritoUrl: 'https://uploads-trilhante-sp.s3.amazonaws.com/oab/oab-1-fase/provas-antigas/xli/prova-xli-gabarito-preliminar.pdf' },
  { number: 42, numeral: 'XLII',    year: 2024, semester: 2, examDate: '2024-12-08',
    provaUrl: 'https://oab.fgv.br/arq/645/402439_OAB%2042%20-%20ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf',
    gabaritoUrl: 'https://oab.fgv.br/arq/645/273585_OAB42%20Gabaritos%20para%20publicação%20-%20V20241203%20(003).pdf' },
  { number: 43, numeral: 'XLIII',   year: 2025, semester: 1, examDate: '2025-04-27',
    provaUrl: 'https://oab.fgv.br/arq/646/838452_ADVOGADO%20OAB(CNS01)%20Tipo%201.pdf',
    gabaritoUrl: 'https://oab.fgv.br/arq/646/194143_oab251_gabarito_definitivo_ms.pdf' },
  { number: 44, numeral: 'XLIV',    year: 2025, semester: 2, examDate: '2025-08-24',
    provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xliv/prova-objetiva-xliv-oab.pdf',
    gabaritoUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xliv/gabarito-objetiva-xliv-oab.pdf' },
  { number: 45, numeral: 'XLV',     year: 2025, semester: 2, examDate: '2025-12-07',
    provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xlv/exame_oab_45.pdf',
    gabaritoUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xlv/exame_oab_45_gabarito.pdf' },
  { number: 46, numeral: 'XLVI',    year: 2026, semester: 1, examDate: '2026-04-27',
    provaUrl: 'https://uploads-trilhante-sp.s3.sa-east-1.amazonaws.com/oab/oab-1-fase/provas-antigas/xlvi/exame_oab_46.pdf',
    gabaritoUrl: 'https://s.oab.org.br/arquivos/2026/05/0662d6ed-01a3-4ee5-905f-a6704d72992b.pdf' },
]

// ─── Utility ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().substring(11, 19)
  console.log(`[${ts}] ${msg}`)
}

function save(filename: string, data: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

function load<T>(filename: string): T | null {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) as T } catch { return null }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── Phase 1: Download + Parse ────────────────────────────────────────────────

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
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

function parseQuestions(text: string): { questions: ParsedQuestion[]; strategy: string } {
  const norm = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Strategy 1: QUESTÃO N heading
  const s1 = parseWithPattern1(norm)
  if (s1.length >= 5) return { questions: s1, strategy: 'questao-heading' }

  // Strategy 2: numbered lines "N -" or "N."
  const s2 = parseWithPattern2(norm)
  if (s2.length >= 5) return { questions: s2, strategy: 'numbered-lines' }

  return { questions: [], strategy: 'none' }
}

function parseWithPattern1(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const re = /(?:QUESTÃO|Questão|QUESTAO)\s+(\d{1,3})([\s\S]*?)(?=(?:QUESTÃO|Questão|QUESTAO)\s+\d{1,3}|$)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1], 10)
    const block = m[2].trim()
    const extracted = extractAlternatives(block)
    if (extracted) questions.push({ number: num, ...extracted, correctAnswer: '' })
  }
  return questions
}

function parseWithPattern2(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const re = /^(\d{1,3})\s*[-\.]\s*\n([\s\S]*?)(?=^\d{1,3}\s*[-\.]|$)/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1], 10)
    const block = m[2].trim()
    const extracted = extractAlternatives(block)
    if (extracted) questions.push({ number: num, ...extracted, correctAnswer: '' })
  }
  return questions
}

function extractAlternatives(block: string): Omit<ParsedQuestion, 'number' | 'correctAnswer'> | null {
  const alts: Record<string, string> = {}

  // Try (A) style
  const parenRe = /\(([A-Da-d])\)\s*([\s\S]*?)(?=\([A-Da-d]\)|$)/g
  let m: RegExpExecArray | null
  while ((m = parenRe.exec(block)) !== null) {
    alts[m[1].toLowerCase()] = m[2].replace(/\n/g, ' ').trim()
  }

  // Try A) style
  if (!alts.a) {
    const plainRe = /^([A-Da-d])\)\s*([\s\S]*?)(?=^[A-Da-d]\)|$)/gm
    while ((m = plainRe.exec(block)) !== null) {
      alts[m[1].toLowerCase()] = m[2].replace(/\n/g, ' ').trim()
    }
  }

  if (!alts.a) return null

  let stEnd = block.search(/\([A-Da-d]\)/)
  if (stEnd < 0) stEnd = block.search(/^[A-Da-d]\)/m)
  const statement = (stEnd > 0 ? block.substring(0, stEnd) : block.split('\n')[0])
    .replace(/\n/g, ' ').trim()

  if (!statement || statement.length < 10) return null

  return {
    statement,
    alternatives: {
      a: alts.a || '',
      b: alts.b || '',
      c: alts.c || '',
      d: alts.d || '',
    },
  }
}

function parseGabarito(text: string): Record<number, string> {
  const answers: Record<number, string> = {}
  const norm = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const patterns = [
    /(?:QUESTÃO|Questão|QUESTAO)\s+(\d{1,3})\s*[:\-]\s*([A-Da-d])/gi,
    /^(\d{1,3})\s*[\.\-\)]\s*([A-Da-d])\b/gm,
    /^(\d{1,3})\s+([A-Da-d])\s*$/gm,
    /(\d{1,3})\s*:\s*([A-Da-d])\b/g,
  ]

  for (const re of patterns) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(norm)) !== null) {
      const n = parseInt(m[1], 10)
      if (n > 0 && n <= 200 && !answers[n]) {
        answers[n] = m[2].toLowerCase()
      }
    }
  }

  return answers
}

async function phase1(): Promise<RawExam[]> {
  const existing = load<RawExam[]>('phase1-raw.json')
  if (existing && existing.length > 0) {
    log(`Phase 1: resuming — ${existing.length} exams already in cache`)
    return existing
  }

  log('Phase 1: Downloading PDFs and extracting questions...')
  const results: RawExam[] = []

  for (const exam of EXAM_CATALOG) {
    log(`  [${exam.numeral}] Fetching prova...`)
    const provaBuffer = await fetchBuffer(exam.provaUrl)

    let questions: ParsedQuestion[] = []
    let strategy = 'none'

    if (provaBuffer && provaBuffer.length > 1000) {
      log(`  [${exam.numeral}] Extracting text (${provaBuffer.length} bytes)...`)
      const text = await extractPdfText(provaBuffer)

      if (text.length > 100) {
        const parsed = parseQuestions(text)
        questions = parsed.questions
        strategy = parsed.strategy
        log(`  [${exam.numeral}] Parsed ${questions.length} questions (strategy: ${strategy})`)
      } else {
        log(`  [${exam.numeral}] PDF text extraction returned empty`)
      }
    } else {
      log(`  [${exam.numeral}] Could not download prova PDF`)
    }

    // Fetch gabarito
    log(`  [${exam.numeral}] Fetching gabarito...`)
    const gabBuffer = await fetchBuffer(exam.gabaritoUrl)
    let gabAnswers: Record<number, string> = {}

    if (gabBuffer && gabBuffer.length > 100) {
      const gabText = await extractPdfText(gabBuffer)
      gabAnswers = parseGabarito(gabText)
      log(`  [${exam.numeral}] Parsed ${Object.keys(gabAnswers).length} gabarito answers`)
    } else {
      log(`  [${exam.numeral}] Could not download gabarito PDF`)
    }

    // Apply gabarito answers
    for (const q of questions) {
      q.correctAnswer = gabAnswers[q.number] || ''
    }

    results.push({
      number: exam.number,
      numeral: exam.numeral,
      year: exam.year,
      examDate: exam.examDate,
      provaUrl: exam.provaUrl,
      gabaritoUrl: exam.gabaritoUrl,
      questions,
      parseStrategy: strategy,
    })

    save('phase1-raw.json', results)
    await sleep(500)
  }

  log(`Phase 1 complete: ${results.length} exams, ${results.reduce((s, e) => s + e.questions.length, 0)} questions`)
  return results
}

// ─── Phase 2: Claude classification ──────────────────────────────────────────

const DISCIPLINES_LIST = `
Direito Constitucional, Direito Civil, Direito Penal, Direito Processual Civil,
Direito Processual Penal, Direito do Trabalho, Direito Processual do Trabalho,
Direito Administrativo, Direito Tributário, Direito Empresarial, Direito Ambiental,
Direito do Consumidor, Direitos Humanos, Direito Internacional, Direito Previdenciário,
Direito Financeiro, Filosofia do Direito, Estatuto da Criança e do Adolescente (ECA),
Ética Profissional (OAB)
`.trim()

async function classifyBatch(
  client: Anthropic,
  questions: Array<{ id: string; number: number; statement: string; alternatives: { a: string; b: string; c: string; d: string } }>
): Promise<Record<string, Classification>> {
  const prompt = `Você é um classificador especializado em questões jurídicas da OAB.
Classifique CADA questão abaixo em: disciplina (de acordo com a lista), subtema e microtema.

DISCIPLINAS VÁLIDAS:
${DISCIPLINES_LIST}

Questões:
${questions.map(q => `[${q.id}] ${q.statement.substring(0, 400)}`).join('\n\n')}

Responda APENAS com JSON válido no formato:
{
  "id": { "discipline": "...", "subtheme": "...", "microtheme": "..." },
  ...
}`

  const msg = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in classification response')

  return JSON.parse(jsonMatch[0]) as Record<string, Classification>
}

async function phase2(rawExams: RawExam[]): Promise<ClassifiedExam[]> {
  const existing = load<ClassifiedExam[]>('phase2-classified.json')
  if (existing && existing.length > 0) {
    log(`Phase 2: resuming — ${existing.length} exams already classified`)
    return existing
  }

  log('Phase 2: Classifying questions with Claude AI...')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })
  const classified: ClassifiedExam[] = JSON.parse(JSON.stringify(rawExams)) as ClassifiedExam[]

  // Collect all questions needing classification
  const allQs: Array<{ examIdx: number; qIdx: number; id: string; number: number; statement: string; alternatives: { a: string; b: string; c: string; d: string } }> = []

  for (let ei = 0; ei < classified.length; ei++) {
    for (let qi = 0; qi < classified[ei].questions.length; qi++) {
      const q = classified[ei].questions[qi]
      if (q.statement.length > 20) {
        allQs.push({ examIdx: ei, qIdx: qi, id: `${ei}_${qi}`, number: q.number, statement: q.statement, alternatives: q.alternatives })
      }
    }
  }

  log(`  Total questions to classify: ${allQs.length}`)

  const BATCH = 15
  for (let i = 0; i < allQs.length; i += BATCH) {
    const batch = allQs.slice(i, i + BATCH)
    log(`  Classifying batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(allQs.length / BATCH)} (${batch.length} questions)...`)

    try {
      const results = await classifyBatch(client, batch)

      for (const item of batch) {
        const cls = results[item.id]
        if (cls) {
          const q = classified[item.examIdx].questions[item.qIdx] as ClassifiedQuestion
          q.classification = cls
        }
      }

      save('phase2-classified.json', classified)
    } catch (err) {
      log(`  Batch ${Math.floor(i / BATCH) + 1} failed: ${err}. Skipping...`)
    }

    await sleep(1000)
  }

  log(`Phase 2 complete`)
  return classified
}

// ─── Phase 3: Statistics + Predictions ───────────────────────────────────────

async function phase3(classified: ClassifiedExam[]): Promise<{ stats: SubjectStat[]; predictions: Prediction[] }> {
  const existing = load<{ stats: SubjectStat[]; predictions: Prediction[] }>('phase3-analysis.json')
  if (existing) {
    log(`Phase 3: resuming — analysis already computed`)
    return existing
  }

  log('Phase 3: Computing statistics and predictions...')

  const totalExams = classified.length
  const recent10 = classified.slice(-10)
  const recent5 = classified.slice(-5)

  // Aggregate by discipline
  const subjectMap = new Map<string, SubjectStat>()

  for (const exam of classified) {
    const disciplinesInThisExam = new Set<string>()

    for (const q of exam.questions) {
      const cls = (q as ClassifiedQuestion).classification
      if (!cls) continue

      const disc = cls.discipline
      if (!disc) continue

      if (!subjectMap.has(disc)) {
        subjectMap.set(disc, {
          name: disc,
          totalQuestions: 0,
          presenceInExams: 0,
          totalExams,
          avgPerExam: 0,
          percentageHistorical: 0,
          trend: 'stable',
          recentCount: 0,
          oldCount: 0,
          subthemes: {},
        })
      }

      const stat = subjectMap.get(disc)!
      stat.totalQuestions++
      disciplinesInThisExam.add(disc)

      // Subtheme
      if (cls.subtheme) {
        if (!stat.subthemes[cls.subtheme]) {
          stat.subthemes[cls.subtheme] = { totalQuestions: 0, presenceInExams: 0, microthemes: {} }
        }
        stat.subthemes[cls.subtheme].totalQuestions++

        if (cls.microtheme) {
          if (!stat.subthemes[cls.subtheme].microthemes[cls.microtheme]) {
            stat.subthemes[cls.subtheme].microthemes[cls.microtheme] = { totalQuestions: 0, presenceInExams: 0 }
          }
          stat.subthemes[cls.subtheme].microthemes[cls.microtheme].totalQuestions++
        }
      }
    }

    for (const disc of disciplinesInThisExam) {
      subjectMap.get(disc)!.presenceInExams++
    }
  }

  // Count recent vs old for trend
  const totalAllQ = classified.reduce((s, e) => s + e.questions.length, 0)

  for (const [disc, stat] of subjectMap) {
    stat.avgPerExam = stat.totalQuestions / totalExams
    stat.percentageHistorical = (stat.totalQuestions / totalAllQ) * 100

    let recentCount = 0
    let oldCount = 0
    for (const exam of recent10) {
      for (const q of exam.questions) {
        if ((q as ClassifiedQuestion).classification?.discipline === disc) recentCount++
      }
    }
    for (const exam of classified.slice(0, -10)) {
      for (const q of exam.questions) {
        if ((q as ClassifiedQuestion).classification?.discipline === disc) oldCount++
      }
    }
    stat.recentCount = recentCount
    stat.oldCount = oldCount

    const recentAvg = recentCount / Math.max(recent10.length, 1)
    const oldAvg = oldCount / Math.max(classified.length - recent10.length, 1)

    if (recentAvg > oldAvg * 1.2) stat.trend = 'growing'
    else if (recentAvg < oldAvg * 0.8) stat.trend = 'declining'
    else stat.trend = 'stable'
  }

  const stats = Array.from(subjectMap.values())
    .sort((a, b) => b.totalQuestions - a.totalQuestions)

  // ── Predictions ──────────────────────────────────────────────────────────────

  log('  Generating predictions with Claude...')

  const apiKey = process.env.ANTHROPIC_API_KEY!
  const client = new Anthropic({ apiKey })

  const statsContext = stats.map(s =>
    `${s.name}: ${s.totalQuestions} questões históricas (${s.percentageHistorical.toFixed(1)}%), média ${s.avgPerExam.toFixed(1)}/prova, trend: ${s.trend}, presença: ${s.presenceInExams}/${totalExams} provas`
  ).join('\n')

  const recent5Context = recent5.map(e => {
    const discs = new Map<string, number>()
    for (const q of e.questions) {
      const d = (q as ClassifiedQuestion).classification?.discipline
      if (d) discs.set(d, (discs.get(d) || 0) + 1)
    }
    return `${e.numeral} Exame (${e.year}): ${Array.from(discs.entries()).map(([d, c]) => `${d}(${c})`).join(', ')}`
  }).join('\n')

  const predPrompt = `Você é um especialista em análise preditiva de provas da OAB (Ordem dos Advogados do Brasil).

Com base no histórico de ${totalExams} provas (2010-2026), gere uma lista com os TOP 50 tópicos mais prováveis para o próximo exame.

ESTATÍSTICAS HISTÓRICAS POR DISCIPLINA:
${statsContext}

ÚLTIMAS 5 PROVAS:
${recent5Context}

Para cada tópico, inclua:
- rank (1-50, sendo 1 o mais provável)
- discipline (disciplina)
- subtheme (subtema específico)
- microtheme (microtema específico)
- probability (0.0 a 1.0)
- frequencyHistorical (frequência histórica 0.0-1.0)
- frequencyRecent (frequência nas últimas 5 provas 0.0-1.0)
- trend ("growing", "stable", ou "declining")
- justification (justificativa em 1-2 frases)

Responda APENAS com JSON válido:
[
  {
    "rank": 1,
    "discipline": "...",
    "subtheme": "...",
    "microtheme": "...",
    "probability": 0.95,
    "frequencyHistorical": 0.88,
    "frequencyRecent": 0.95,
    "trend": "stable",
    "justification": "..."
  },
  ...
]`

  let predictions: Prediction[] = []

  try {
    const msg = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: predPrompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      predictions = JSON.parse(jsonMatch[0]) as Prediction[]
    }
  } catch (err) {
    log(`  Predictions Claude call failed: ${err}`)
  }

  const analysis = { stats, predictions }
  save('phase3-analysis.json', analysis)
  log(`Phase 3 complete: ${stats.length} subjects, ${predictions.length} predictions`)
  return analysis
}

// ─── Phase 4: Seed the database ───────────────────────────────────────────────

async function phase4(classified: ClassifiedExam[], analysis: { stats: SubjectStat[]; predictions: Prediction[] }) {
  log('Phase 4: Seeding the database...')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const client = postgres(dbUrl, { prepare: false, max: 5 })

  // Import schema using relative path (tsx handles TS files directly)
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

  // ── Insert subjects / subsubjects / microtopics ────────────────────────────

  log('  Inserting subjects...')
  const subjectIdMap = new Map<string, string>()
  const subsubjectIdMap = new Map<string, string>()
  const microtopicIdMap = new Map<string, string>()

  const { eq } = await import('drizzle-orm') as typeof import('drizzle-orm')

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

  const uniqueSubjects = new Set<string>()
  for (const exam of classified) {
    for (const q of exam.questions) {
      const cls = (q as ClassifiedQuestion).classification
      if (cls?.discipline) uniqueSubjects.add(cls.discipline)
    }
  }

  for (const name of uniqueSubjects) {
    const existing = await db.select().from(subjectsTable).where(eq(subjectsTable.name, name)).limit(1)
    let id: string

    if (existing.length > 0) {
      id = existing[0].id
    } else {
      const [ins] = await db.insert(subjectsTable).values({
        name,
        color: SUBJECT_COLORS[name] || '#2563EB',
      }).returning({ id: subjectsTable.id })
      id = ins.id
    }

    subjectIdMap.set(name, id)
  }

  log(`  Inserted ${subjectIdMap.size} subjects`)

  // Collect all unique subthemes per subject
  const subthemeMap = new Map<string, Set<string>>()
  const microthemeMap = new Map<string, Set<string>>()

  for (const exam of classified) {
    for (const q of exam.questions) {
      const cls = (q as ClassifiedQuestion).classification
      if (!cls?.discipline || !cls.subtheme) continue

      const key = `${cls.discipline}::${cls.subtheme}`
      if (!subthemeMap.has(key)) subthemeMap.set(key, new Set())

      if (cls.microtheme) {
        const mKey = `${key}::${cls.microtheme}`
        if (!microthemeMap.has(mKey)) microthemeMap.set(mKey, new Set())
      }
    }
  }

  for (const [key] of subthemeMap) {
    const [disc, sub] = key.split('::')
    const subjectId = subjectIdMap.get(disc)
    if (!subjectId) continue

    const existing = await db.select().from(subsubjectsTable)
      .where(eq(subsubjectsTable.name, sub))
      .limit(1)

    let id: string
    if (existing.length > 0) {
      id = existing[0].id
    } else {
      const [ins] = await db.insert(subsubjectsTable).values({
        subjectId,
        name: sub,
      }).returning({ id: subsubjectsTable.id })
      id = ins.id
    }
    subsubjectIdMap.set(key, id)
  }

  log(`  Inserted ${subsubjectIdMap.size} subsubjects`)

  for (const [mKey] of microthemeMap) {
    const [disc, sub, micro] = mKey.split('::')
    const subsubjectId = subsubjectIdMap.get(`${disc}::${sub}`)
    if (!subsubjectId) continue

    const existing = await db.select().from(microtopicsTable)
      .where(eq(microtopicsTable.name, micro))
      .limit(1)

    let id: string
    if (existing.length > 0) {
      id = existing[0].id
    } else {
      const [ins] = await db.insert(microtopicsTable).values({
        subsubjectId,
        name: micro,
      }).returning({ id: microtopicsTable.id })
      id = ins.id
    }
    microtopicIdMap.set(mKey, id)
  }

  log(`  Inserted ${microtopicIdMap.size} microtopics`)

  // ── Insert exams + questions ───────────────────────────────────────────────

  log('  Inserting exams and questions...')

  for (const exam of classified) {
    if (exam.questions.length === 0) {
      log(`  [${exam.numeral}] Skipping — no questions`)
      continue
    }

    // Upsert exam
    const existingExam = await db.select().from(examsTable)
      .where(eq(examsTable.examNumber, exam.number))
      .limit(1)

    let examId: string

    if (existingExam.length > 0) {
      examId = existingExam[0].id
      log(`  [${exam.numeral}] Exam already exists (${examId}), updating questions...`)
    } else {
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
      examId = ins.id
      log(`  [${exam.numeral}] Inserted exam`)
    }

    // Insert questions in chunks
    const CHUNK = 20
    for (let i = 0; i < exam.questions.length; i += CHUNK) {
      const chunk = exam.questions.slice(i, i + CHUNK)
      await db.insert(examQuestionsTable).values(
        chunk.map((q) => {
          const cls = (q as ClassifiedQuestion).classification
          const subjectId = cls?.discipline ? subjectIdMap.get(cls.discipline) : undefined
          const subsubjectId = cls?.subtheme
            ? subsubjectIdMap.get(`${cls.discipline}::${cls.subtheme}`)
            : undefined
          const microtopicId = cls?.microtheme
            ? microtopicIdMap.get(`${cls.discipline}::${cls.subtheme}::${cls.microtheme}`)
            : undefined

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
      ).onConflictDoNothing()
    }

    log(`  [${exam.numeral}] Inserted ${exam.questions.length} questions`)
  }

  // ── Insert statistics ──────────────────────────────────────────────────────

  log('  Inserting statistics...')

  for (const stat of analysis.stats) {
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

  log(`  Inserted ${analysis.stats.length} statistics records`)

  // ── Insert predictions ─────────────────────────────────────────────────────

  log('  Inserting predictions...')

  const nextExamNumber = Math.max(...classified.map(e => e.number)) + 1

  for (const pred of analysis.predictions) {
    const subjectId = subjectIdMap.get(pred.discipline)
    const subsubjectId = pred.subtheme
      ? subsubjectIdMap.get(`${pred.discipline}::${pred.subtheme}`)
      : undefined
    const microtopicId = pred.microtheme
      ? microtopicIdMap.get(`${pred.discipline}::${pred.subtheme}::${pred.microtheme}`)
      : undefined

    await db.insert(predictionsTable).values({
      subjectId,
      subsubjectId,
      microtopicId,
      rank: pred.rank,
      probability: pred.probability,
      frequencyHistorical: pred.frequencyHistorical,
      frequencyRecent: pred.frequencyRecent,
      trend: pred.trend as 'growing' | 'stable' | 'declining',
      justification: pred.justification,
      generatedAt: new Date(),
      generatedForExam: nextExamNumber,
    })
  }

  log(`  Inserted ${analysis.predictions.length} predictions`)

  await client.end()
  log('Phase 4 complete — database seeded!')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  OAB Historical Import — 46 Exams (2010-2026)')
  console.log('═══════════════════════════════════════════════════════════════')

  const rawExams = await phase1()
  const classifiedExams = await phase2(rawExams)
  const analysis = await phase3(classifiedExams)
  await phase4(classifiedExams, analysis)

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  DONE! Historical data seeded successfully.')
  console.log(`  Exams: ${classifiedExams.length}`)
  console.log(`  Questions: ${classifiedExams.reduce((s, e) => s + e.questions.length, 0)}`)
  console.log(`  Predictions: ${analysis.predictions.length}`)
  console.log('═══════════════════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

'use strict'

/**
 * Re-classifies all questions in phase1-fixed.json using the updated
 * classify-topics.js (20 disciplines) and uploads the results to Supabase.
 *
 * - Questions whose discipline still maps 1-to-1 to a new discipline keep
 *   the same discipline but get their tema/microtema updated.
 * - Questions with the old merged discipline "Direito Internacional e Direitos
 *   Humanos" are re-scored across all 20 disciplines to determine whether they
 *   belong to "Direito Internacional" or "Direitos Humanos".
 *
 * Run: node scripts/reclassify-upload.js
 */

const fs = require('fs')
const path = require('path')
const { classifyTema, classifyAll } = require('./classify-topics.js')

// ─── ENV ──────────────────────────────────────────────────────────────────────
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const eq = line.indexOf('=')
  if (eq > 0) {
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

const postgres = require('postgres')
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL not set in .env.local')

const url = new URL(dbUrl)
const sql = postgres({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  database: url.pathname.slice(1),
  username: url.username,
  password: decodeURIComponent(url.password),
  ssl: 'require',
  prepare: false,
  max: 3,
  connect_timeout: 20,
})

// Disciplines that exist in the new 20-discipline structure (verbatim keys in TOPICS)
const NEW_DISCIPLINES = new Set([
  'Estatuto da Advocacia e Ética Profissional',
  'Direito Constitucional',
  'Direito Administrativo',
  'Direito Civil',
  'Direito Processual Civil',
  'Direito Penal',
  'Direito Processual Penal',
  'Direito do Trabalho',
  'Direito Processual do Trabalho',
  'Direito Empresarial',
  'Direito Tributário',
  'Filosofia do Direito e Teoria Geral do Direito',
  'Direito Internacional',
  'Direitos Humanos',
  'Direito do Consumidor',
  'Direito da Criança e do Adolescente',
  'Direito Ambiental',
  'Direito Eleitoral',
  'Direito Financeiro',
  'Direito Previdenciário',
])

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function getOrCreateSubject(cache, name) {
  if (cache.has(name)) return cache.get(name)

  const rows = await sql`
    SELECT id FROM subjects WHERE lower(name) = lower(${name}) LIMIT 1
  `
  if (rows.length > 0) {
    cache.set(name, rows[0].id)
    return rows[0].id
  }

  const ins = await sql`
    INSERT INTO subjects (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
    RETURNING id
  `
  const id = ins[0]?.id || (await sql`
    SELECT id FROM subjects WHERE lower(name) = lower(${name}) LIMIT 1
  `)[0]?.id

  if (id) cache.set(name, id)
  return id
}

async function getOrCreateSubsubject(cache, subjectId, name) {
  const key = `${subjectId}||${name.toLowerCase()}`
  if (cache.has(key)) return cache.get(key)

  const rows = await sql`
    SELECT id FROM subsubjects
    WHERE subject_id = ${subjectId} AND lower(name) = lower(${name})
    LIMIT 1
  `
  if (rows.length > 0) {
    cache.set(key, rows[0].id)
    return rows[0].id
  }

  const ins = await sql`
    INSERT INTO subsubjects (subject_id, name)
    VALUES (${subjectId}, ${name})
    ON CONFLICT DO NOTHING
    RETURNING id
  `
  const id = ins[0]?.id || (await sql`
    SELECT id FROM subsubjects
    WHERE subject_id = ${subjectId} AND lower(name) = lower(${name})
    LIMIT 1
  `)[0]?.id

  if (id) cache.set(key, id)
  return id
}

async function getOrCreateMicrotopic(cache, subsubjectId, name) {
  if (!name || !name.trim()) return null
  const key = `${subsubjectId}||${name.toLowerCase()}`
  if (cache.has(key)) return cache.get(key)

  const rows = await sql`
    SELECT id FROM microtopics
    WHERE subsubject_id = ${subsubjectId} AND lower(name) = lower(${name})
    LIMIT 1
  `
  if (rows.length > 0) {
    cache.set(key, rows[0].id)
    return rows[0].id
  }

  const ins = await sql`
    INSERT INTO microtopics (subsubject_id, name)
    VALUES (${subsubjectId}, ${name})
    ON CONFLICT DO NOTHING
    RETURNING id
  `
  const id = ins[0]?.id || (await sql`
    SELECT id FROM microtopics
    WHERE subsubject_id = ${subsubjectId} AND lower(name) = lower(${name})
    LIMIT 1
  `)[0]?.id

  if (id) cache.set(key, id)
  return id
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const dataPath = path.join(__dirname, 'data', 'phase1-fixed.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  console.log(`Loaded ${data.length} exams from phase1-fixed.json`)

  // ── Step 1: Re-classify all questions ─────────────────────────────────────
  let totalQuestions = 0
  let disciplineChanged = 0
  let temaChanged = 0

  for (const exam of data) {
    for (const q of exam.questions) {
      const text = [
        q.statement || '',
        ...Object.values(q.alternatives || {}),
      ].join(' ')

      const oldDiscipline = q.discipline || ''
      const oldTema = q.tema || ''
      const oldMicrotema = q.microtema || ''

      let newDiscipline, newTema, newMicrotema

      // Always re-classify from scratch using full keyword scoring.
      // Pass hintDiscipline so equal-score ties preserve the current discipline.
      const hint = NEW_DISCIPLINES.has(oldDiscipline) ? oldDiscipline : null
      const result = classifyAll(text, hint)
      newDiscipline = result.discipline
      newTema = result.tema
      newMicrotema = result.microtema

      if (newDiscipline !== oldDiscipline) disciplineChanged++
      if (newTema !== oldTema || newMicrotema !== oldMicrotema) temaChanged++

      q.discipline = newDiscipline
      q.tema = newTema
      q.microtema = newMicrotema
      totalQuestions++
    }
  }

  console.log(`Re-classified ${totalQuestions} questions`)
  console.log(`  Discipline changed : ${disciplineChanged}`)
  console.log(`  Tema/microtema changed : ${temaChanged}`)

  // Save updated JSON
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
  console.log('Saved updated phase1-fixed.json\n')

  // ── Step 2: Upload to database ─────────────────────────────────────────────
  const subjectCache = new Map()
  const subsubjectCache = new Map()
  const microtopicCache = new Map()

  let updatedQuestions = 0
  let skipped = 0
  let examCount = 0

  for (const exam of data) {
    const examRows = await sql`
      SELECT id FROM exams WHERE exam_number = ${exam.number} LIMIT 1
    `
    if (examRows.length === 0) {
      console.warn(`  Exam ${exam.numeral} not found in DB — skipping`)
      skipped += exam.questions.length
      continue
    }
    const examId = examRows[0].id
    examCount++

    for (const q of exam.questions) {
      if (!q.discipline || !q.tema) { skipped++; continue }

      const qRows = await sql`
        SELECT id FROM exam_questions
        WHERE exam_id = ${examId} AND number = ${q.number}
        LIMIT 1
      `
      if (qRows.length === 0) { skipped++; continue }
      const questionId = qRows[0].id

      const subjectId = await getOrCreateSubject(subjectCache, q.discipline)
      if (!subjectId) { skipped++; continue }

      const subsubjectId = await getOrCreateSubsubject(subsubjectCache, subjectId, q.tema)
      if (!subsubjectId) { skipped++; continue }

      const microtopicId = await getOrCreateMicrotopic(microtopicCache, subsubjectId, q.microtema)

      await sql`
        UPDATE exam_questions
        SET
          subject_id    = ${subjectId},
          subsubject_id = ${subsubjectId},
          microtopic_id = ${microtopicId},
          classified    = true,
          classified_at = NOW()
        WHERE id = ${questionId}
      `
      updatedQuestions++
    }

    console.log(`  Exam ${exam.numeral}: ${exam.questions.length} questions updated`)
  }

  console.log('\n─── Summary ────────────────────────────────────────')
  console.log(`Exams in DB       : ${examCount}`)
  console.log(`Questions updated : ${updatedQuestions}`)
  console.log(`Skipped           : ${skipped}`)
  console.log(`Subjects          : ${subjectCache.size}`)
  console.log(`Subsubjects       : ${subsubjectCache.size}`)
  console.log(`Microtopics       : ${microtopicCache.size}`)

  await sql.end()
}

main().catch(async err => {
  console.error('Fatal error:', err)
  await sql.end()
  process.exit(1)
})

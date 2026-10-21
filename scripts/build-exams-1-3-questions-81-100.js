// Adds questions 81-100 of Exames I, II and III (the only exams with 100 questions;
// the original import stopped at 80) as migration 0006.
//
// Input: scripts/data/exams-1-3-questions-81-100.json, made by
// scripts/extract-exams-1-3-questions-81-100.py from the official PDFs and answer keys.
// Subjects, subtopics and ebook chapters (Ética) were assigned by reading each question.
//
// Usage: node scripts/build-exams-1-3-questions-81-100.js

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.join(__dirname, '..')
const MIGRATIONS = path.join(ROOT, 'src/lib/db/migrations')
const TAG = '0006_exams_1_3_questions_81_100'

const EXAMS = { I: { number: 1, year: 2010 }, II: { number: 2, year: 2010 }, III: { number: 3, year: 2011 } }

const PT = 'Direito Processual do Trabalho'
const AMB = 'Direito Ambiental'
const PEN = 'Direito Penal'
const PP = 'Direito Processual Penal'
const ECA = 'Direito da Criança e do Adolescente'
const ETICA = 'Estatuto da Advocacia e Ética Profissional'
const EMP = 'Direito Empresarial'
const INT = 'Direito Internacional'
const CDC = 'Direito do Consumidor'
const TRIB = 'Direito Tributário'

// [subject, subtopic, ebook chapter (Ética only)]
const CLASSIFICATION = {
  I: {
    81: [PT, 'Reclamação Trabalhista e Audiência'],
    82: [PT, 'Organização e Competência da Justiça do Trabalho'],
    83: [AMB, 'Princípios e Política Nacional do Meio Ambiente'],
    84: [AMB, 'Responsabilidade Ambiental'],
    85: [PEN, 'Penas e Extinção da Punibilidade'],
    86: [PEN, 'Penas e Extinção da Punibilidade'],
    87: [PEN, 'Teoria Geral do Crime'],
    88: [PEN, 'Crimes em Espécie'],
    89: [PEN, 'Crimes em Espécie'],
    90: [PEN, 'Aplicação da Lei Penal'],
    91: [PEN, 'Penas e Extinção da Punibilidade'],
    92: [PP, 'Processo Penal Geral'],
    93: [PP, 'Recursos no Processo Penal'],
    94: [PP, 'Ação Penal'],
    95: [PP, 'Procedimentos e Julgamento'],
    96: [PP, 'Provas no Processo Penal'],
    97: [PP, 'Procedimentos e Julgamento'],
    98: [PP, 'Processo Penal Geral'],
    99: [ECA, 'Princípios e Proteção Integral'],
    100: [ECA, 'Família Substituta e Adoção'],
  },
  II: {
    81: [ETICA, 'Prerrogativas e Imunidades', 1],
    82: [ETICA, 'Ética e Estatuto da Advocacia', 6],
    83: [ETICA, 'Inscrição e Exercício da Advocacia', 8],
    84: [ETICA, 'Prerrogativas e Imunidades', 1],
    85: [ETICA, 'Prerrogativas e Imunidades', 1],
    86: [ETICA, 'Infrações e Sanções Disciplinares', 3],
    87: [ETICA, 'Honorários Advocatícios', 2],
    88: [ETICA, 'Infrações e Sanções Disciplinares', 3],
    89: [ETICA, 'Ética e Estatuto da Advocacia', 4],
    90: [ETICA, 'Prerrogativas e Imunidades', 1],
    91: [EMP, 'Tipos Societários'],
    92: [EMP, 'Tipos Societários'],
    93: [INT, 'Direito Internacional Público'],
    94: [INT, 'Direito Internacional Público'],
    95: [ECA, 'Família Substituta e Adoção'],
    96: [ECA, 'Família Substituta e Adoção'],
    97: [AMB, 'Princípios e Política Nacional do Meio Ambiente'],
    98: [AMB, 'Responsabilidade Ambiental'],
    99: [CDC, 'Relação de Consumo e Sujeitos'],
    100: [CDC, 'Relação de Consumo e Sujeitos'],
  },
  III: {
    81: [PT, 'Organização e Competência da Justiça do Trabalho'],
    82: [TRIB, 'Crédito Tributário e Lançamento'],
    83: [TRIB, 'Crédito Tributário e Lançamento'],
    84: [TRIB, 'Competência Tributária'],
    85: [TRIB, 'Princípios Tributários'],
    86: [TRIB, 'Obrigação Tributária'],
    87: [TRIB, 'Espécies Tributárias'],
    88: [TRIB, 'Competência Tributária'],
    89: [TRIB, 'Imunidade e Isenção Tributária'],
    90: [AMB, 'Código Florestal e Áreas Protegidas'],
    91: [AMB, 'Licenciamento e Avaliação de Impacto'],
    92: [CDC, 'Responsabilidade pelo Fato e pelo Vício'],
    93: [AMB, 'Código Florestal e Áreas Protegidas'],
    94: [CDC, 'Responsabilidade pelo Fato e pelo Vício'],
    95: [ECA, 'Medidas de Proteção e Socioeducativas'],
    96: [INT, 'Direito Internacional Público'],
    97: [ECA, 'Família Substituta e Adoção'],
    98: [CDC, 'Relação de Consumo e Sujeitos'],
    99: [INT, 'Organizações Internacionais'],
    100: [INT, 'Direito Internacional Público'],
  },
}

// Stable ids so rerunning the script doesn't change the migration
function uuidFor(key) {
  const h = crypto.createHash('sha1').update(`exams-1-3-q81-100:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
const subject = name => `(SELECT \`id\` FROM \`subjects\` WHERE \`name\` = ${q(name)} LIMIT 1)`
const subsubject = (subj, name) =>
  `(SELECT ss.\`id\` FROM \`subsubjects\` ss JOIN \`subjects\` s ON s.\`id\` = ss.\`subject_id\` WHERE s.\`name\` = ${q(subj)} AND ss.\`name\` = ${q(name)} LIMIT 1)`
const ebookTopic = (subj, order) =>
  order
    ? `(SELECT t.\`id\` FROM \`ebook_topics\` t JOIN \`subjects\` s ON s.\`id\` = t.\`subject_id\` WHERE s.\`name\` = ${q(subj)} AND t.\`order\` = ${order} LIMIT 1)`
    : 'NULL'

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/exams-1-3-questions-81-100.json'), 'utf8'))
if (questions.length !== 60) throw new Error(`expected 60 questions, found ${questions.length}`)

const stmts = []
for (const item of questions) {
  const exam = EXAMS[item.exam]
  const [subj, sub, chapter] = CLASSIFICATION[item.exam][item.number]
  if (!/^[abcd]$/.test(item.correct)) throw new Error(`bad answer ${item.exam}-${item.number}`)
  const alternatives = JSON.stringify({ a: item.alternatives.a, b: item.alternatives.b, c: item.alternatives.c, d: item.alternatives.d })

  // INSERT…SELECT: skipped when the exam is missing or the question is already there
  stmts.push(`INSERT INTO \`exam_questions\` (\`id\`, \`exam_id\`, \`number\`, \`statement\`, \`alternatives\`, \`correct_answer\`, \`subject_id\`, \`subsubject_id\`, \`ebook_topic_id\`, \`difficulty\`, \`classified\`, \`classified_at\`)
SELECT ${q(uuidFor(`${item.exam}-${item.number}`))}, e.\`id\`, ${item.number}, ${q(item.statement)}, ${q(alternatives)}, ${q(item.correct)}, ${subject(subj)}, ${subsubject(subj, sub)}, ${ebookTopic(subj, chapter)}, 'medium', true, NOW()
FROM \`exams\` e WHERE e.\`exam_number\` = ${exam.number} AND e.\`year\` = ${exam.year}
AND NOT EXISTS (SELECT 1 FROM \`exam_questions\` x WHERE x.\`exam_id\` = e.\`id\` AND x.\`number\` = ${item.number})`)
}

stmts.push(`UPDATE \`exams\` e SET e.\`total_questions\` = (SELECT COUNT(*) FROM \`exam_questions\` x WHERE x.\`exam_id\` = e.\`id\`)
WHERE (e.\`exam_number\`, e.\`year\`) IN ((1, 2010), (2, 2010), (3, 2011))`)

const header = '-- Questões 81 a 100 dos Exames I, II e III (provas de 100 questões), geradas por scripts/build-exams-1-3-questions-81-100.js\n'
fs.writeFileSync(path.join(MIGRATIONS, `${TAG}.sql`), header + stmts.join(';--> statement-breakpoint\n') + ';\n')

// Data-only migration: journal entry plus a copy of the previous snapshot
const journalPath = path.join(MIGRATIONS, 'meta/_journal.json')
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'))
if (!journal.entries.some(e => e.tag === TAG)) {
  const prev = journal.entries.at(-1)
  journal.entries.push({ idx: prev.idx + 1, version: prev.version, when: Date.now(), tag: TAG, breakpoints: true })
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + '\n')
  const prevSnap = JSON.parse(fs.readFileSync(path.join(MIGRATIONS, `meta/${String(prev.idx).padStart(4, '0')}_snapshot.json`), 'utf8'))
  const snap = { ...prevSnap, id: crypto.randomUUID(), prevId: prevSnap.id }
  fs.writeFileSync(path.join(MIGRATIONS, `meta/${TAG.slice(0, 4)}_snapshot.json`), JSON.stringify(snap, null, 2) + '\n')
}
console.log(`wrote ${TAG}.sql: ${questions.length} questions`)

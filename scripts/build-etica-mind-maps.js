// Adds the Ética mind maps and the ebook PDF to the student library and puts each
// chapter's mind map in the Ética training (right after the chapter reading).
//
// Assets (already in public/, regenerate only if the sources change):
//   - public/mapas-mentais/etica/capitulo-NN.webp: one page of
//     "Mapas mentais - Etica - Caps 01 a 20 (todos).pdf" each, rendered at 2.5x
//     (PyMuPDF get_pixmap + Pillow WEBP quality 88)
//   - public/mapas-mentais/etica/mapas-mentais-etica-completo.pdf: the source PDF
//   - public/materiais/ebook-etica-descomplicando-oab.pdf: the ebook docx exported
//     to PDF with Word
//
// Usage: node scripts/build-etica-mind-maps.js
// Rewrites the data section of migration 0005 (everything after DATA_MARKER).

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.join(__dirname, '..')
const MIGRATIONS = path.join(ROOT, 'src/lib/db/migrations')
const TARGET = path.join(MIGRATIONS, '0005_mind_maps_and_ebooks.sql')
const DATA_MARKER = '-- Dados: mapas mentais e ebook de Ética (scripts/build-etica-mind-maps.js)'

const TRAINING_ID = '51eacdc1-6ecc-4404-afd8-cf7b1ea56b74'
const SUBJECT = "(SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1)"
const EBOOK_PDF = '/materiais/ebook-etica-descomplicando-oab.pdf'
const EBOOK_DOCX = '/materiais/ebook-etica-descomplicando-oab.docx'
const FULL_PDF = '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf'

// Stable ids so rerunning the script doesn't change the migration
function uuidFor(key) {
  const h = crypto.createHash('sha1').update(`etica-mind-maps:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`

// Chapter days of the training built by migration 0004 (chapter N is day N + 1)
const training = fs.readFileSync(path.join(MIGRATIONS, '0004_etica_ebook_training.sql'), 'utf8')
const dayRe = new RegExp(`VALUES \\('([0-9a-f-]{36})', '${TRAINING_ID}', (\\d+), '[^']*', 'Capítulo (\\d+) — ([^']+)'`, 'g')
const chapters = [...training.matchAll(dayRe)].map(m => ({
  dayId: m[1],
  chapter: Number(m[3]),
  title: m[4],
}))
if (chapters.length !== 20) throw new Error(`expected 20 chapter days, found ${chapters.length}`)

for (const c of chapters) {
  const file = path.join(ROOT, 'public/mapas-mentais/etica', `capitulo-${String(c.chapter).padStart(2, '0')}.webp`)
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`)
}
const ebookSize = fs.statSync(path.join(ROOT, 'public', EBOOK_PDF)).size

const stmts = []

stmts.push(`INSERT INTO \`ebooks\` (\`id\`, \`subject_id\`, \`title\`, \`description\`, \`pdf_url\`, \`size_bytes\`, \`page_count\`, \`order\`)
VALUES (${q(uuidFor('ebook'))}, ${SUBJECT}, 'Ética — Descomplicando OAB (Edição 2026)', ${q('Estatuto da Advocacia, Regulamento Geral e Código de Ética e Disciplina em 20 capítulos, na ordem de incidência na prova, com raio-X, pegadinhas da FGV e questões comentadas.')}, ${q(EBOOK_PDF)}, ${ebookSize}, 78, 1)`)

for (const c of chapters) {
  const mapId = uuidFor(`map-${c.chapter}`)
  const nn = String(c.chapter).padStart(2, '0')
  stmts.push(`INSERT INTO \`mind_maps\` (\`id\`, \`subject_id\`, \`title\`, \`chapter\`, \`image_url\`, \`pdf_url\`, \`order\`)
VALUES (${q(mapId)}, ${SUBJECT}, ${q(c.title)}, ${c.chapter}, ${q(`/mapas-mentais/etica/capitulo-${nn}.webp`)}, ${q(FULL_PDF)}, ${c.chapter})`)

  // Make room after the reading, then add the mind map as the chapter's 2nd activity.
  // INSERT…SELECT so nothing happens if the training day was deleted.
  stmts.push(`UPDATE \`training_topics\` SET \`order\` = \`order\` + 1 WHERE \`training_day_id\` = ${q(c.dayId)} AND \`order\` >= 2`)
  stmts.push(`INSERT INTO \`training_topics\` (\`id\`, \`training_day_id\`, \`order\`, \`title\`, \`type\`, \`subject_id\`, \`content\`, \`estimated_minutes\`)
SELECT ${q(uuidFor(`topic-${c.chapter}`))}, \`id\`, 2, ${q(`Mapa mental: ${c.title}`)}, 'mind_map', ${SUBJECT}, ${q(JSON.stringify({ mindMapId: mapId }))}, 10
FROM \`training_days\` WHERE \`id\` = ${q(c.dayId)}`)
}

// The training readings now point to the PDF version of the ebook
stmts.push(`UPDATE \`apostilas\` SET \`pdf_url\` = ${q(EBOOK_PDF)}, \`content_html\` = REPLACE(\`content_html\`, ${q(EBOOK_DOCX)}, ${q(EBOOK_PDF)}) WHERE \`pdf_url\` = ${q(EBOOK_DOCX)}`)

const current = fs.readFileSync(TARGET, 'utf8')
const schemaPart = current.split(DATA_MARKER)[0].trimEnd().replace(/;?(--> statement-breakpoint)?$/, '')
const out = `${schemaPart};--> statement-breakpoint\n${DATA_MARKER}\n${stmts.join(';--> statement-breakpoint\n')};\n`
fs.writeFileSync(TARGET, out)
console.log(`wrote ${path.relative(ROOT, TARGET)}: ${chapters.length} mind maps, 1 ebook`)

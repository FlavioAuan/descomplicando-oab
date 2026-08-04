/**
 * Fills in placeholder questions for any exam with < 80 questions.
 * Correct answers come from GABARITOS hardcoded object.
 * Run: node scripts/fill-placeholders.js
 */

const fs = require('fs')
const path = require('path')

const OUTPUT_PATH = path.join(__dirname, 'data', 'phase1-raw.json')

const GABARITOS = {
  'I':     'A,ANULADA,A,A,B,A,D,A,C,D,ANULADA,B,D,C,A,C,D,D,B,C,D,C,A,ANULADA,B,B,D,D,C,B,ANULADA,A,ANULADA,C,A,A,B,C,D,A,C,D,B,B,D,C,B,A,A,B,D,C,D,A,D,D,B,C,D,D,C,D,B,C,A,B,A,B,B,A,B,C,C,C,A,D,C,C,C,D',
  'II':    'C,A,B,A,C,D,C,A,B,C,D,B,A,D,B,B,A,B,D,A,B,B,A,A,C,B,C,A,D,D,C,D,C,D,A,B,D,B,A,C,B,B,B,D,C,C,B,D,D,B,C,A,C,D,B,D,A,A,A,C,D,D,C,A,C,C,B,D,D,B,B,A,B,D,A,D,D,D,A,D',
  'VII':   'B,B,D,A,B,C,B,D,D,C,B,B,B,C,D,B,D,D,C,B,B,C,C,A,D,D,D,C,D,C,D,D,D,A,B,B,C,B,D,D,D,B,B,C,C,B,B,A,D,C,D,B,B,A,C,C,C,C,D,B,A,D,B,A,A,D,C,A,A,B,B,A,B,C,B,D,D,C,D,C',
  'VIII':  'C,C,B,B,C,C,B,B,C,D,D,C,A,B,D,B,A,D,C,B,D,A,A,A,B,C,D,B,A,A,A,B,C,B,A,D,A,C,D,B,B,D,C,D,A,C,B,B,B,A,C,C,B,A,C,B,C,B,B,B,A,A,C,B,A,C,C,B,D,D,C,C,B,B,B,C,C,A,A,C',
  'IX':    'D,C,C,B,D,B,D,B,B,B,C,B,C,A,D,C,D,C,B,D,B,C,A,B,A,B,A,D,C,B,D,C,C,A,D,A,C,B,D,C,B,A,B,A,D,D,A,A,B,D,C,A,D,A,C,B,B,B,C,A,B,B,A,A,B,A,A,D,D,B,C,C,A,C,C,C,B,D,B,A',
  'X':     'B,D,B,B,A,B,B,B,D,C,D,B,D,D,C,B,D,B,B,D,A,C,B,D,B,D,D,B,D,A,A,B,D,D,B,A,B,B,C,C,B,C,A,D,C,A,A,A,A,D,D,D,A,D,A,C,D,B,B,A,B,A,B,C,A,D,C,C,C,D,B,B,A,C,C,D,D,C,A,B',
  'XI':    'B,B,B,B,C,C,B,B,D,B,B,D,B,D,D,C,D,B,D,C,B,B,C,A,D,B,A,B,D,A,C,C,D,B,C,B,C,D,B,B,A,C,C,A,A,D,C,A,D,B,C,A,B,D,C,D,C,B,B,D,C,D,C,A,D,C,D,A,B,A,A,C,B,B,B,C,A,C,D,C',
  'XII':   'D,D,B,B,C,D,B,C,B,C,B,A,B,C,A,A,C,A,D,D,C,D,C,D,A,A,A,D,B,C,D,C,B,D,B,D,D,B,B,A,C,C,C,B,C,B,B,B,B,C,C,B,A,A,C,C,C,D,C,A,B,C,C,C,C,B,A,D,D,C,A,B,D,A,D,C,B,D,D,B',
  'XIII':  'B,B,D,A,C,B,B,B,B,C,B,D,D,B,A,D,C,B,D,D,C,C,A,C,A,C,D,A,C,A,C,A,C,B,D,C,A,A,D,A,D,A,D,C,D,A,D,B,D,D,B,A,D,A,D,D,C,A,C,C,D,D,B,D,A,B,B,D,B,D,B,A,C,D,A,B,B,C,A,B',
  'XIV':   'B,B,A,D,A,B,D,D,D,C,B,A,B,A,B,B,D,C,A,B,D,C,A,B,C,C,A,B,D,B,B,B,D,A,D,B,D,C,D,D,A,A,D,A,C,A,C,C,B,A,B,C,B,B,B,A,C,A,A,C,A,A,C,B,D,B,C,A,B,C,D,B,C,C,C,D,A,B,A,B',
  'XV':    'C,C,B,A,B,D,C,C,B,A,B,A,C,A,D,B,D,B,D,A,B,D,B,B,D,C,B,D,B,C,A,D,ANULADA,C,B,D,C,C,C,D,A,A,A,C,A,D,B,C,C,B,C,A,C,A,C,D,D,C,C,B,B,B,D,B,C,A,B,B,B,A,A,B,A,D,B,B,B,ANULADA,A,C',
  'XVI':   'D,A,D,C,B,D,B,C,A,C,B,A,C,C,C,B,A,B,A,D,A,A,C,B,D,A,B,C,B,B,D,A,B,C,C,A,A,A,B,A,B,C,D,C,B,C,D,D,C,D,C,B,D,D,B,A,B,A,C,C,D,C,B,C,D,A,A,C,D,C,D,A,D,C,B,C,B,C,A,C',
  'XVII':  'C,C,A,A,A,B,B,D,C,D,C,B,C,A,C,B,C,D,C,ANULADA,D,A,D,B,D,D,B,B,A,C,C,A,D,B,A,D,C,A,D,D,C,A,B,C,C,B,D,A,C,D,A,B,B,A,C,D,A,D,D,D,B,C,C,A,B,D,B,C,B,B,A,B,D,A,B,ANULADA,D,A,B,A',
  'XVIII': 'A,D,A,B,A,D,A,D,A,C,C,C,D,A,C,B,C,C,B,A,B,B,D,C,A,D,D,C,A,B,B,D,B,A,D,C,A,D,D,B,D,C,D,C,B,C,C,B,B,A,C,A,B,B,B,D,D,D,C,D,A,D,C,D,C,D,B,C,C,D,A,C,A,C,B,A,A,C,A,A',
  'XIX':   'D,B,C,C,C,D,D,D,A,B,A,D,B,D,A,A,D,B,B,D,A,B,C,C,C,C,C,C,B,B,C,D,D,C,C,C,B,C,B,C,C,B,C,A,C,A,C,C,A,B,D,A,C,B,D,D,A,B,B,B,D,B,B,A,D,A,B,D,D,B,D,A,B,D,A,D,D,C,A,D',
  'XX':    'B,D,B,D,C,B,A,D,A,C,D,B,C,A,C,B,D,C,D,B,A,A,C,B,B,D,D,A,C,A,D,A,B,C,C,A,A,B,B,D,C,D,C,C,D,C,C,D,B,A,B,C,D,B,D,B,C,A,B,C,D,D,C,A,D,A,A,B,D,D,C,A,D,B,A,D,C,D,A,B',
  'XXI':   'A,D,B,B,C,C,C,B,D,B,C,D,B,B,D,B,D,C,D,C,C,A,D,D,D,C,A,C,B,C,D,C,C,C,B,B,C,D,D,A,C,A,D,D,B,B,C,A,B,A,D,C,A,C,B,B,B,C,A,A,B,C,D,D,B,A,B,A,A,A,A,B,C,A,B,A,B,B,C,D',
  'XXII':  'D,A,B,D,B,A,B,C,B,D,A,D,C,D,C,B,A,B,B,D,D,A,C,D,A,D,B,C,C,A,C,D,A,D,A,C,A,D,D,A,B,B,D,D,A,D,B,B,B,C,D,C,C,B,C,C,D,C,A,A,B,D,C,A,C,B,B,B,A,B,A,A,A,C,D,C,C,A,C,B',
  'XXIII': 'D,C,A,C,A,A,B,C,D,A,D,B,B,B,A,C,A,D,B,B,C,D,C,A,B,D,C,D,A,D,A,A,D,D,A,C,A,C,A,C,B,B,D,D,C,B,C,D,C,B,D,B,C,C,C,B,C,B,B,C,D,B,D,C,D,B,D,C,D,C,B,D,C,A,A,D,C,D,A,A',
  'XXIV':  'D,B,A,C,C,C,A,D,B,C,D,B,B,A,B,B,C,C,D,C,B,B,B,C,D,B,C,D,D,B,C,A,B,B,D,A,D,C,D,B,B,C,D,A,A,A,C,D,A,B,B,D,C,D,C,B,B,C,A,A,D,B,D,A,C,B,C,D,A,A,C,D,C,B,D,A,A,A,D,A',
  'XXV':   'B,D,C,D,C,D,A,C,A,B,A,C,B,D,C,C,C,D,A,A,B,D,C,D,C,B,C,C,A,B,D,D,A,B,D,B,A,D,B,B,A,D,C,C,A,A,B,B,A,B,A,B,B,C,B,D,C,C,D,A,A,D,A,B,B,B,A,C,D,C,A,B,A,A,A,A,C,B,B,A',
  'XXVI':  'C,C,B,C,A,A,B,C,B,D,D,A,C,B,C,A,C,B,C,A,D,A,C,D,B,D,D,A,B,B,C,D,B,C,C,A,C,D,B,A,D,D,B,A,A,C,A,A,D,C,D,D,A,D,A,B,B,D,D,A,C,B,D,A,D,B,C,D,C,C,A,B,D,B,B,A,C,A,C,B',
  'XXVII': 'A,C,C,D,D,D,B,A,D,C,C,A,A,B,C,D,B,D,B,C,D,B,B,C,A,A,A,D,B,C,A,B,A,C,B,C,A,C,A,B,D,A,B,D,A,D,B,D,A,B,C,D,A,D,A,C,B,C,B,C,B,D,D,B,D,C,A,B,C,D,A,D,A,A,C,B,A,D,C,C',
  'XXVIII':'D,B,B,A,C,A,D,D,A,B,D,B,A,D,C,D,A,C,D,B,C,D,A,A,C,B,C,A,A,D,A,C,C,D,B,C,D,A,B,D,C,D,B,D,B,A,B,C,B,C,C,A,B,B,D,B,A,C,D,D,A,C,B,B,A,D,A,C,B,D,C,C,B,A,D,A,D,A,C,B',
  'XXIX':  'D,B,B,C,A,D,B,B,C,A,D,C,A,C,B,D,D,B,D,B,B,B,C,B,B,C,A,B,C,A,C,B,B,A,A,A,D,B,C,C,D,A,B,A,C,B,C,A,D,B,C,B,D,D,B,C,B,A,C,D,D,D,D,C,D,C,B,C,A,C,C,D,C,D,D,A,B,C,B,D',
  'XXX':   'C,B,B,C,D,A,A,B,A,A,D,B,D,A,C,B,C,D,C,C,C,D,A,B,D,C,A,D,C,A,C,D,A,B,A,D,B,D,A,C,B,B,A,D,D,B,B,D,C,A,C,D,A,C,C,D,B,D,B,C,B,C,A,A,C,D,B,D,D,B,A,D,A,B,A,C,B,A,B,C',
  'XXXI':  'D,B,B,D,A,B,D,B,A,A,B,A,B,D,C,C,A,A,D,C,D,D,B,D,B,B,A,D,A,D,B,A,D,D,A,C,B,D,C,D,C,C,D,A,B,A,C,D,A,A,B,D,D,C,C,B,B,A,D,C,C,C,C,C,B,C,C,D,A,B,A,C,B,A,A,B,B,C,B,D',
  'XXXII': 'C,B,D,B,B,B,D,A,D,D,B,C,B,D,A,D,B,B,A,D,A,B,C,D,B,B,C,D,C,A,D,C,A,D,C,C,A,D,A,C,A,A,B,C,C,A,B,D,C,C,B,C,C,A,B,A,D,C,D,C,D,B,A,B,D,C,D,D,A,A,C,C,B,C,A,B,B,B,B,A',
  'XXXIII':'D,D,D,D,B,C,A,C,D,C,A,A,B,D,C,C,D,A,C,C,C,B,C,D,B,A,A,A,C,B,B,A,B,B,C,C,A,C,D,A,A,C,B,B,B,A,B,C,C,D,C,A,C,B,C,B,D,D,A,D,C,D,A,B,A,C,D,D,C,B,D,A,A,B,A,D,D,D,A,B',
  'XXXIV': 'B,C,A,B,D,A,C,B,D,C,A,D,B,A,D,A,D,C,D,B,B,D,D,B,A,D,C,D,C,C,A,B,D,B,C,A,B,B,B,B,B,A,C,A,C,B,D,C,C,C,B,C,B,D,A,A,A,B,B,A,A,D,C,C,D,B,C,C,C,B,C,B,A,D,B,D,D,A,A,D',
  'XXXV':  'C,D,B,D,C,C,B,A,B,B,B,B,B,D,C,A,B,C,B,B,C,C,B,C,C,A,B,A,A,C,A,B,B,D,D,C,D,D,D,B,C,C,A,D,B,C,D,D,A,ANULADA,A,B,C,C,D,A,C,C,ANULADA,D,A,A,C,C,B,D,D,B,D,C,C,B,B,B,A,A,A,A,A,C',
  'XXXVI': 'B,A,D,D,B,C,D,D,A,B,C,B,D,B,C,A,A,A,D,B,D,C,C,C,B,A,D,A,D,B,C,D,B,A,D,C,B,B,B,B,D,B,B,D,C,A,D,B,A,C,A,D,C,A,C,A,C,B,C,D,C,A,C,D,A,B,D,A,D,B,C,C,A,A,A,C,A,B,C,A',
  'XXXVII':'D,D,B,D,B,C,ANULADA,A,D,C,D,B,A,B,C,B,B,D,D,A,C,A,B,C,C,B,D,A,D,A,D,D,D,A,C,B,B,C,A,C,B,B,D,D,C,A,C,D,A,C,C,C,B,C,D,B,B,A,C,D,A,B,D,D,B,C,A,C,ANULADA,A,A,A,D,B,B,A,B,A,D,B',
  'XXXVIII':'C,D,B,A,C,B,D,B,A,A,D,C,A,C,C,A,C,C,D,B,B,A,D,B,C,D,A,D,C,D,A,D,A,D,D,C,D,A,C,D,B,A,C,C,B,A,A,D,B,A,B,C,D,D,A,B,A,B,B,D,B,B,C,C,A,B,C,C,A,B,D,D,B,B,B,C,A,C,A,D',
  'XXXIX': 'A,D,D,C,A,D,B,A,D,D,C,B,A,C,A,B,B,C,A,C,B,A,C,A,C,D,A,D,C,D,A,D,C,A,B,C,C,D,B,D,C,D,B,B,C,B,A,B,D,A,B,D,C,D,D,D,A,B,B,B,D,A,C,C,D,A,A,C,C,B,D,B,B,A,B,C,B,A,A,C',
  'XL':    'B,C,A,C,A,C,D,A,B,C,B,D,B,B,B,D,A,B,D,A,D,B,A,C,A,C,D,D,B,C,D,B,D,D,A,C,B,C,C,B,C,A,D,C,D,C,B,A,A,C,B,D,B,A,D,C,A,B,D,A,D,A,C,C,A,B,A,B,C,A,B,A,C,D,D,D,C,C,B,A',
  'XLI':   'B,A,B,D,A,B,C,C,B,B,B,C,B,B,B,A,A,B,C,B,A,B,A,C,D,C,D,C,B,C,D,A,D,C,C,D,D,B,D,A,D,D,A,B,A,A,C,D,A,B,D,D,B,B,C,A,D,C,D,A,D,C,A,A,C,A,C,C,D,A,A,C,D,C,B,C,D,B,A,A',
  'XLII':  'D,B,D,A,D,B,C,A,D,A,B,A,D,A,D,D,A,B,B,D,B,D,C,B,C,C,A,A,C,B,C,A,A,D,C,A,D,B,C,B,D,C,ANULADA,C,C,B,C,A,A,D,B,C,D,B,C,B,C,A,C,C,A,C,B,A,B,A,D,C,A,B,C,C,D,B,C,A,D,A,D,B',
  'XLIII': 'ANULADA,C,A,A,C,B,D,C,B,D,D,B,B,A,B,C,C,A,D,D,C,C,D,B,C,B,A,B,A,D,C,A,A,C,D,B,B,A,B,A,C,B,B,D,A,D,A,B,D,A,C,D,C,A,B,B,C,D,C,A,D,C,D,B,A,D,A,B,B,D,C,B,A,ANULADA,D,C,C,A,D,A',
  'XLIV':  'C,B,B,A,C,B,C,C,A,D,C,D,C,D,D,B,D,A,D,C,D,A,B,C,C,C,D,B,A,D,A,A,D,C,B,A,D,C,C,A,D,B,A,A,B,A,C,B,B,A,C,D,A,A,B,D,D,D,B,C,D,C,B,D,C,B,A,B,A,A,D,C,B,A,C,A,D,B,B,A',
  'XLV':   'A,A,C,C,B,A,D,B,B,C,C,D,B,A,D,A,B,A,C,A,D,C,A,D,B,C,B,B,D,B,D,A,A,D,D,C,C,D,A,A,B,D,D,C,B,D,B,C,A,C,B,C,D,A,B,D,D,C,D,C,A,B,C,A,B,C,B,D,A,D,A,D,D,B,D,C,B,B,A,A',
  'XLVI':  'C,D,C,A,D,A,C,D,B,C,C,B,B,D,C,D,B,D,A,A,D,C,A,C,B,D,B,C,D,D,A,B,B,A,C,A,A,D,B,B,A,B,D,C,B,D,A,B,C,C,B,C,C,C,A,B,B,D,A,A,B,C,D,B,D,B,A,B,B,A,D,D,A,A,C,C,D,A,D,B',
}

function main() {
  const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))

  for (const exam of data) {
    const raw = GABARITOS[exam.numeral]
    if (exam.questions.length === 80) continue

    const answers = raw ? raw.split(',') : []
    const existing = new Map(exam.questions.map(q => [q.number, q]))

    console.log(`${exam.numeral}: ${exam.questions.length} → 80 questions (filling ${80 - exam.questions.length} missing)`)

    const full = []
    for (let i = 1; i <= 80; i++) {
      if (existing.has(i)) {
        full.push(existing.get(i))
      } else {
        const ans = answers[i - 1]
        full.push({
          number: i,
          text: `Questão ${i}`,
          options: { a: '', b: '', c: '', d: '' },
          correctAnswer: !ans || ans === 'ANULADA' ? '' : ans.toLowerCase(),
        })
      }
    }
    exam.questions = full
  }

  // Final gabarito pass to ensure correctness
  for (const exam of data) {
    const raw = GABARITOS[exam.numeral]
    if (!raw) continue
    const answers = raw.split(',')
    for (const q of exam.questions) {
      const ans = answers[q.number - 1]
      if (!ans) continue
      q.correctAnswer = ans === 'ANULADA' ? '' : ans.toLowerCase()
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8')

  console.log('\nFinal state:')
  let perfect = 0
  for (const e of data) {
    const answered = e.questions.filter(q => q.correctAnswer).length
    const anuladas = e.questions.filter(q => {
      const raw = GABARITOS[e.numeral]
      if (!raw) return false
      return raw.split(',')[q.number - 1] === 'ANULADA'
    }).length
    const flag = e.questions.length !== 80 ? ' ⚠ WRONG COUNT' : ''
    if (e.questions.length === 80) perfect++
    console.log(`  ${e.numeral.padEnd(8)}: ${e.questions.length} questions, ${answered} with answers, ${anuladas} anuladas${flag}`)
  }
  console.log(`\n${perfect}/46 exams with exactly 80 questions.`)
}

main()

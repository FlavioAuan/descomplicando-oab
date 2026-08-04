/**
 * Converts phase1-raw.json field names to match the import script's expected format.
 * text → statement, options → alternatives
 * Also adds provaUrl, gabaritoUrl, parseStrategy fields.
 */

const fs = require('fs')
const path = require('path')

const OUTPUT_PATH = path.join(__dirname, 'data', 'phase1-raw.json')

const EXAM_URLS = {
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

const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))

const converted = data.map(exam => {
  const urls = EXAM_URLS[exam.numeral] || {}
  return {
    number: exam.number,
    numeral: exam.numeral,
    year: exam.year,
    examDate: exam.examDate,
    provaUrl: urls.provaUrl || '',
    gabaritoUrl: urls.gabaritoUrl || '',
    parseStrategy: 'imported',
    questions: exam.questions.map(q => ({
      number: q.number,
      statement: q.text || q.statement || '',
      alternatives: q.options || q.alternatives || { a: '', b: '', c: '', d: '' },
      correctAnswer: q.correctAnswer || '',
    })),
  }
})

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(converted, null, 2), 'utf8')

console.log('Converted! Sample question:')
const sample = converted[0].questions[0]
console.log(JSON.stringify(sample).slice(0, 200))
console.log('\nTotal exams:', converted.length)
console.log('Total questions:', converted.reduce((s, e) => s + e.questions.length, 0))

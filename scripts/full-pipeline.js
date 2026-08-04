/**
 * Full pipeline: download missing PDFs, extract questions, apply gabaritos.
 * Run: node scripts/full-pipeline.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const pdf = require('pdf-parse')

const SCRIPTS_DIR = __dirname
const DATA_DIR = path.join(SCRIPTS_DIR, 'data')
const PROVAS_DIR = path.join(DATA_DIR, 'pdfs', 'provas')
const GABARITOS_DIR = path.join(DATA_DIR, 'pdfs', 'gabaritos')
const OUTPUT_PATH = path.join(DATA_DIR, 'phase1-raw.json')

// Ensure dirs exist
fs.mkdirSync(PROVAS_DIR, { recursive: true })
fs.mkdirSync(GABARITOS_DIR, { recursive: true })

// ─── CATALOG ──────────────────────────────────────────────────────────────────

const EXAM_CATALOG = [
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

// ─── HARDCODED GABARITOS (TIPO 1 / Branco) ───────────────────────────────────
// Source of truth for correct answers. 'ANULADA' = annulled (stored as '').

const GABARITOS = {
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

// ─── HTTP DOWNLOAD ────────────────────────────────────────────────────────────

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      const size = fs.statSync(dest).size
      if (size > 1000) {
        console.log(`  [skip] already exists: ${path.basename(dest)} (${size} bytes)`)
        resolve(true)
        return
      }
    }
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    const request = proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlinkSync(dest)
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        const size = fs.statSync(dest).size
        console.log(`  [ok] ${path.basename(dest)} (${size} bytes)`)
        resolve(true)
      })
    })
    request.on('error', (err) => {
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(err)
    })
    request.on('timeout', () => {
      request.destroy()
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(new Error(`Timeout downloading ${url}`))
    })
  })
}

// ─── PDF TEXT EXTRACTION ──────────────────────────────────────────────────────

async function extractText(filePath) {
  const buf = fs.readFileSync(filePath)
  const result = await pdf(buf)
  return result.text
}

// ─── QUESTION PARSERS ─────────────────────────────────────────────────────────

function cleanText(s) {
  // Normalize excessive whitespace but preserve single spaces
  return s.replace(/\s+/g, ' ').trim()
}

// Strategy 1: "QUESTÃO N" pattern (older exams I-XXIX)
function parseWithQuestaoPattern(text) {
  const pattern = /QUEST[AÃ]O\s+(\d+)\s*([\s\S]*?)(?=QUEST[AÃ]O\s+\d+|$)/gi
  const matches = [...text.matchAll(pattern)]
  const questions = []
  for (const m of matches) {
    const num = parseInt(m[1])
    if (num < 1 || num > 80) continue
    const body = cleanText(m[2])
    if (body.length < 10) continue
    questions.push({ number: num, text: body })
  }
  return questions
}

// Strategy 2: "N -" or "N." or "N " pattern at line start (mixed format)
function parseWithNumberedLines(text) {
  // Split on question boundaries: number at start of "paragraph"
  const lines = text.split('\n')
  const questions = []
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Match lines that start with just a number (1-80) possibly followed by space/dash/dot
    const m = line.match(/^(\d{1,2})\s*[-.]?\s*$/)
    // OR match lines where the number at start followed by substantial text
    const m2 = line.match(/^(\d{1,2})\s+(.{20,})$/)

    if (m && !m2) {
      const num = parseInt(m[1])
      if (num >= 1 && num <= 80) {
        if (current && current.text.length > 20) questions.push(current)
        current = { number: num, text: '' }
        continue
      }
    }
    if (m2) {
      const num = parseInt(m2[1])
      if (num >= 1 && num <= 80) {
        if (current && current.text.length > 20) questions.push(current)
        current = { number: num, text: m2[2] }
        continue
      }
    }

    if (current) {
      current.text += ' ' + line
    }
  }
  if (current && current.text.length > 20) questions.push(current)

  // Clean texts
  return questions.map(q => ({ ...q, text: cleanText(q.text) }))
}

// Strategy 3: Detect question blocks by number sequence in dense text
function parseWithNumberSequence(text) {
  // Look for patterns like "\n1\n" or " 1 " followed by question text
  // This handles the format: "\n2 \n1 \nEm certa situação..."

  // Normalize the text first
  const normalized = text.replace(/\r/g, '').replace(/\f/g, '\n\n')

  // Try to find question start markers: standalone numbers on their own lines
  // followed by question content
  const segments = normalized.split(/\n{2,}/)

  // Find all segments that start with a number 1-80
  const questions = []
  let buffer = []
  let currentNum = null

  for (const seg of segments) {
    const trimmed = seg.trim()
    const m = trimmed.match(/^(\d{1,2})[\s\n]/)
    if (m) {
      const num = parseInt(m[1])
      if (num >= 1 && num <= 80) {
        if (currentNum !== null && buffer.length > 0) {
          const text = cleanText(buffer.join(' '))
          if (text.length > 20) questions.push({ number: currentNum, text })
        }
        currentNum = num
        buffer = [trimmed.slice(m[0].length)]
        continue
      }
    }
    if (currentNum !== null) {
      buffer.push(trimmed)
    }
  }
  if (currentNum !== null && buffer.length > 0) {
    const text = cleanText(buffer.join(' '))
    if (text.length > 20) questions.push({ number: currentNum, text })
  }

  return questions
}

// Strategy 4: Aggressive number boundary detection for newer PDFs
function parseWithAggressiveNumbers(text) {
  // Normalize text: collapse multiple spaces but keep newlines
  const clean = text
    .replace(/\r/g, '')
    .replace(/\f/g, '\n')
    .replace(/[ \t]+/g, ' ')

  // Find all question boundaries: a number 1-80 appearing after newline(s)
  // possibly preceded/followed by whitespace
  const pattern = /(?:^|\n)\s*(\d{1,2})\s*\n/g
  const boundaries = []
  let m
  while ((m = pattern.exec(clean)) !== null) {
    const num = parseInt(m[1])
    if (num >= 1 && num <= 80) {
      boundaries.push({ num, pos: m.index + m[0].length - 1 })
    }
  }

  if (boundaries.length < 40) return []

  const questions = []
  for (let i = 0; i < boundaries.length; i++) {
    const { num, pos } = boundaries[i]
    const end = i + 1 < boundaries.length ? boundaries[i + 1].pos : clean.length
    const text = cleanText(clean.slice(pos, end))
    if (text.length > 20) {
      questions.push({ number: num, text })
    }
  }
  return questions
}

async function parseProva(filePath, examNumeral) {
  let text
  try {
    text = await extractText(filePath)
  } catch (e) {
    console.error(`  [error] Failed to extract text from ${filePath}: ${e.message}`)
    return []
  }

  console.log(`  [parse] ${examNumeral}: text length ${text.length}`)

  // Try strategies in order, pick the one closest to 80 questions
  const candidates = [
    { name: 'QUESTÃO pattern', fn: () => parseWithQuestaoPattern(text) },
    { name: 'numbered lines', fn: () => parseWithNumberedLines(text) },
    { name: 'number sequence', fn: () => parseWithNumberSequence(text) },
    { name: 'aggressive numbers', fn: () => parseWithAggressiveNumbers(text) },
  ]

  let best = []
  let bestScore = -1

  for (const c of candidates) {
    try {
      const result = c.fn()
      // Score: number of questions found, penalize if not sequential
      const unique = [...new Set(result.map(q => q.number))].sort((a, b) => a - b)
      const score = unique.length
      console.log(`    strategy "${c.name}": ${result.length} raw, ${unique.length} unique`)
      if (score > bestScore) {
        bestScore = score
        best = result
      }
    } catch (e) {
      console.error(`    strategy "${c.name}" error: ${e.message}`)
    }
  }

  // Deduplicate by number (keep first occurrence)
  const seen = new Set()
  const deduped = best.filter(q => {
    if (seen.has(q.number)) return false
    seen.add(q.number)
    return true
  })

  deduped.sort((a, b) => a.number - b.number)
  console.log(`  [result] ${examNumeral}: ${deduped.length} questions`)
  return deduped
}

// ─── GABARITO PARSER ──────────────────────────────────────────────────────────

async function parseGabaritoPDF(filePath) {
  let text
  try {
    text = await extractText(filePath)
  } catch (e) {
    console.error(`  [error] Failed to extract gabarito: ${e.message}`)
    return null
  }

  // Look for TIPO 1 / BRANCO section
  const tipo1Match = text.match(/TIPO\s*1[^]*?(?=TIPO\s*[2-4]|$)/i)
  const searchText = tipo1Match ? tipo1Match[0] : text

  // Extract number-answer pairs from gabarito table
  // Format varies: "1 2 3 ... \n A B C ..." or "1 A 2 B ..."

  // Try format: rows of numbers then rows of answers
  const lines = searchText.split('\n').map(l => l.trim()).filter(l => l)

  const answers = new Map()

  // Look for lines of numbers followed by lines of letters
  for (let i = 0; i < lines.length - 1; i++) {
    const numLine = lines[i]
    const ansLine = lines[i + 1]

    const nums = numLine.match(/\b(\d{1,2})\b/g)
    const ans = ansLine.match(/\b([ABCD])\b/g)

    if (nums && ans && nums.length >= 5 && ans.length >= 5 && nums.length <= ans.length + 2) {
      for (let j = 0; j < Math.min(nums.length, ans.length); j++) {
        const n = parseInt(nums[j])
        if (n >= 1 && n <= 80) {
          answers.set(n, ans[j].toLowerCase())
        }
      }
    }
  }

  // Also try inline format "1-A 2-B" or "1. A"
  const inlinePattern = /\b(\d{1,2})\s*[-.:]\s*([ABCD])\b/gi
  let m
  while ((m = inlinePattern.exec(searchText)) !== null) {
    const n = parseInt(m[1])
    if (n >= 1 && n <= 80) answers.set(n, m[2].toLowerCase())
  }

  if (answers.size < 40) return null
  return answers
}

// ─── MAIN PIPELINE ────────────────────────────────────────────────────────────

async function main() {
  console.log('=== STEP 1: Download missing PDFs ===\n')

  for (const exam of EXAM_CATALOG) {
    const provaPath = path.join(PROVAS_DIR, `${exam.numeral}.pdf`)
    const gabaritoPath = path.join(GABARITOS_DIR, `${exam.numeral}.pdf`)

    const provaExists = fs.existsSync(provaPath) && fs.statSync(provaPath).size > 1000
    const gabaritoExists = fs.existsSync(gabaritoPath) && fs.statSync(gabaritoPath).size > 1000

    if (!provaExists) {
      console.log(`Downloading prova ${exam.numeral}...`)
      try {
        await downloadFile(exam.provaUrl, provaPath)
      } catch (e) {
        console.error(`  [FAIL] ${exam.numeral} prova: ${e.message}`)
      }
    }

    if (!gabaritoExists) {
      console.log(`Downloading gabarito ${exam.numeral}...`)
      try {
        await downloadFile(exam.gabaritoUrl, gabaritoPath)
      } catch (e) {
        console.error(`  [FAIL] ${exam.numeral} gabarito: ${e.message}`)
      }
    }
  }

  console.log('\n=== STEP 2: Load existing phase1-raw.json ===\n')

  let existingData = []
  if (fs.existsSync(OUTPUT_PATH)) {
    existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
  }
  const existingMap = new Map(existingData.map(e => [e.numeral, e]))

  console.log('\n=== STEP 3: Extract questions from PDFs ===\n')

  const results = []

  for (const exam of EXAM_CATALOG) {
    const provaPath = path.join(PROVAS_DIR, `${exam.numeral}.pdf`)
    const existing = existingMap.get(exam.numeral)

    // Use existing if it already has 80 questions
    if (existing && existing.questions.length === 80) {
      console.log(`${exam.numeral}: using existing 80 questions`)
      results.push(existing)
      continue
    }

    if (!fs.existsSync(provaPath) || fs.statSync(provaPath).size < 1000) {
      console.log(`${exam.numeral}: no PDF available, using existing ${existing?.questions?.length || 0} questions`)
      results.push(existing || {
        number: exam.number,
        numeral: exam.numeral,
        year: exam.year,
        semester: exam.semester,
        examDate: exam.examDate,
        questions: [],
      })
      continue
    }

    console.log(`\nParsing ${exam.numeral}...`)
    const questions = await parseProva(provaPath, exam.numeral)

    // If we got fewer questions than existing data, keep whichever is better
    const existingCount = existing?.questions?.length || 0
    let useQuestions = questions
    if (questions.length < existingCount) {
      console.log(`  [warn] parser got ${questions.length}, existing has ${existingCount}; keeping existing`)
      useQuestions = existing.questions
    }

    results.push({
      number: exam.number,
      numeral: exam.numeral,
      year: exam.year,
      semester: exam.semester,
      examDate: exam.examDate,
      questions: useQuestions.map(q => ({
        number: q.number,
        text: q.text || '',
        options: q.options || { a: '', b: '', c: '', d: '' },
        correctAnswer: q.correctAnswer || '',
      })),
    })
  }

  console.log('\n=== STEP 4: Apply gabaritos ===\n')

  for (const exam of results) {
    const hardcoded = GABARITOS[exam.numeral]

    if (hardcoded) {
      // Use hardcoded gabarito (source of truth for II and VII-XLVI)
      const answers = hardcoded.split(',')
      let count = 0
      for (const q of exam.questions) {
        const raw = answers[q.number - 1]
        if (!raw) continue
        if (raw === 'ANULADA') {
          q.correctAnswer = ''
        } else {
          q.correctAnswer = raw.toLowerCase()
        }
        count++
      }
      console.log(`${exam.numeral}: applied ${count} hardcoded answers`)
    } else {
      // Try parsing gabarito PDF (for I, III, IV, V, VI)
      const gabaritoPath = path.join(GABARITOS_DIR, `${exam.numeral}.pdf`)
      if (fs.existsSync(gabaritoPath) && fs.statSync(gabaritoPath).size > 1000) {
        const answerMap = await parseGabaritoPDF(gabaritoPath)
        if (answerMap && answerMap.size >= 40) {
          let count = 0
          for (const q of exam.questions) {
            const ans = answerMap.get(q.number)
            if (ans) {
              q.correctAnswer = ans
              count++
            }
          }
          console.log(`${exam.numeral}: applied ${count} answers from gabarito PDF`)
        } else {
          console.log(`${exam.numeral}: gabarito PDF parsing failed or insufficient (${answerMap?.size || 0} answers)`)
        }
      } else {
        console.log(`${exam.numeral}: no gabarito available`)
      }
    }
  }

  console.log('\n=== STEP 5: Save results ===\n')

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8')

  console.log('Summary:')
  for (const e of results) {
    const answered = e.questions.filter(q => q.correctAnswer).length
    const flag = e.questions.length !== 80 ? ' ⚠' : ''
    console.log(`  ${e.numeral.padEnd(8)}: ${e.questions.length} questions, ${answered} with answers${flag}`)
  }

  console.log('\nDone! phase1-raw.json updated.')
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})

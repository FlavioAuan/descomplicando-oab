'use strict'
/**
 * Reparseia todos os PDFs das provas OAB, extrai questões com alternativas,
 * aplica gabaritos e classifica por disciplina/tema.
 * Run: node scripts/parse-questions-fixed.js
 */

const fs   = require('fs')
const path = require('path')
const { getPdfText, isGarbled, isSurvey, extractAlts, parseBest, cleanAlt } = require('./parse-utils')
const { classifyTema } = require('./classify-topics')

const DATA_DIR   = path.join(__dirname, 'data')
const PROVAS_DIR = path.join(DATA_DIR, 'pdfs', 'provas')
const GAB_DIR    = path.join(DATA_DIR, 'pdfs', 'gabaritos')
const OUT_PATH   = path.join(DATA_DIR, 'phase1-fixed.json')
const RAW_PATH   = path.join(DATA_DIR, 'phase1-raw.json')

// ─── GABARITOS ────────────────────────────────────────────────────────────────

const GABARITOS = {
  'II':     'C,A,B,A,C,D,C,A,B,C,D,B,A,D,B,B,A,B,D,A,B,B,A,A,C,B,C,A,D,D,C,D,C,D,A,B,D,B,A,C,B,B,B,D,C,C,B,D,D,B,C,A,C,D,B,D,A,A,A,C,D,D,C,A,C,C,B,D,D,B,B,A,B,D,A,D,D,D,A,D',
  'VII':    'B,B,D,A,B,C,B,D,D,C,B,B,B,C,D,B,D,D,C,B,B,C,C,A,D,D,D,C,D,C,D,D,D,A,B,B,C,B,D,D,D,B,B,C,C,B,B,A,D,C,D,B,B,A,C,C,C,C,D,B,A,D,B,A,A,D,C,A,A,B,B,A,B,C,B,D,D,C,D,C',
  'VIII':   'C,C,B,B,C,C,B,B,C,D,D,C,A,B,D,B,A,D,C,B,D,A,A,A,B,C,D,B,A,A,A,B,C,B,A,D,A,C,D,B,B,D,C,D,A,C,B,B,B,A,C,C,B,A,C,B,C,B,B,B,A,A,C,B,A,C,C,B,D,D,C,C,B,B,B,C,C,A,A,C',
  'IX':     'D,C,C,B,D,B,D,B,B,B,C,B,C,A,D,C,D,C,B,D,B,C,A,B,A,B,A,D,C,B,D,C,C,A,D,A,C,B,D,C,B,A,B,A,D,D,A,A,B,D,C,A,D,A,C,B,B,B,C,A,B,B,A,A,B,A,A,D,D,B,C,C,A,C,C,C,B,D,B,A',
  'X':      'B,D,B,B,A,B,B,B,D,C,D,B,D,D,C,B,D,B,B,D,A,C,B,D,B,D,D,B,D,A,A,B,D,D,B,A,B,B,C,C,B,C,A,D,C,A,A,A,A,D,D,D,A,D,A,C,D,B,B,A,B,A,B,C,A,D,C,C,C,D,B,B,A,C,C,D,D,C,A,B',
  'XI':     'B,B,B,B,C,C,B,B,D,B,B,D,B,D,D,C,D,B,D,C,B,B,C,A,D,B,A,B,D,A,C,C,D,B,C,B,C,D,B,B,A,C,C,A,A,D,C,A,D,B,C,A,B,D,C,D,C,B,B,D,C,D,C,A,D,C,D,A,B,A,A,C,B,B,B,C,A,C,D,C',
  'XII':    'D,D,B,B,C,D,B,C,B,C,B,A,B,C,A,A,C,A,D,D,C,D,C,D,A,A,A,D,B,C,D,C,B,D,B,D,D,B,B,A,C,C,C,B,C,B,B,B,B,C,C,B,A,A,C,C,C,D,C,A,B,C,C,C,C,B,A,D,D,C,A,B,D,A,D,C,B,D,D,B',
  'XIII':   'B,B,D,A,C,B,B,B,B,C,B,D,D,B,A,D,C,B,D,D,C,C,A,C,A,C,D,A,C,A,C,A,C,B,D,C,A,A,D,A,D,A,D,C,D,A,D,B,D,D,B,A,D,A,D,D,C,A,C,C,D,D,B,D,A,B,B,D,B,D,B,A,C,D,A,B,B,C,A,B',
  'XIV':    'B,B,A,D,A,B,D,D,D,C,B,A,B,A,B,B,D,C,A,B,D,C,A,B,C,C,A,B,D,B,B,B,D,A,D,B,D,C,D,D,A,A,D,A,C,A,C,C,B,A,B,C,B,B,B,A,C,A,A,C,A,A,C,B,D,B,C,A,B,C,D,B,C,C,C,D,A,B,A,B',
  'XV':     'C,C,B,A,B,D,C,C,B,A,B,A,C,A,D,B,D,B,D,A,B,D,B,B,D,C,B,D,B,C,A,D,ANULADA,C,B,D,C,C,C,D,A,A,A,C,A,D,B,C,C,B,C,A,C,A,C,D,D,C,C,B,B,B,D,B,C,A,B,B,B,A,A,B,A,D,B,B,B,ANULADA,A,C',
  'XVI':    'D,A,D,C,B,D,B,C,A,C,B,A,C,C,C,B,A,B,A,D,A,A,C,B,D,A,B,C,B,B,D,A,B,C,C,A,A,A,B,A,B,C,D,C,B,C,D,D,C,D,C,B,D,D,B,A,B,A,C,C,D,C,B,C,D,A,A,C,D,C,D,A,D,C,B,C,B,C,A,C',
  'XVII':   'C,C,A,A,A,B,B,D,C,D,C,B,C,A,C,B,C,D,C,ANULADA,D,A,D,B,D,D,B,B,A,C,C,A,D,B,A,D,C,A,D,D,C,A,B,C,C,B,D,A,C,D,A,B,B,A,C,D,A,D,D,D,B,C,C,A,B,D,B,C,B,B,A,B,D,A,B,ANULADA,D,A,B,A',
  'XVIII':  'A,D,A,B,A,D,A,D,A,C,C,C,D,A,C,B,C,C,B,A,B,B,D,C,A,D,D,C,A,B,B,D,B,A,D,C,A,D,D,B,D,C,D,C,B,C,C,B,B,A,C,A,B,B,B,D,D,D,C,D,A,D,C,D,C,D,B,C,C,D,A,C,A,C,B,A,A,C,A,A',
  'XIX':    'D,B,C,C,C,D,D,D,A,B,A,D,B,D,A,A,D,B,B,D,A,B,C,C,C,C,C,C,B,B,C,D,D,C,C,C,B,C,B,C,C,B,C,A,C,A,C,C,A,B,D,A,C,B,D,D,A,B,B,B,D,B,B,A,D,A,B,D,D,B,D,A,B,D,A,D,D,C,A,D',
  'XX':     'B,D,B,D,C,B,A,D,A,C,D,B,C,A,C,B,D,C,D,B,A,A,C,B,B,D,D,A,C,A,D,A,B,C,C,A,A,B,B,D,C,D,C,C,D,C,C,D,B,A,B,C,D,B,D,B,C,A,B,C,D,D,C,A,D,A,A,B,D,D,C,A,D,B,A,D,C,D,A,B',
  'XXI':    'A,D,B,B,C,C,C,B,D,B,C,D,B,B,D,B,D,C,D,C,C,A,D,D,D,C,A,C,B,C,D,C,C,C,B,B,C,D,D,A,C,A,D,D,B,B,C,A,B,A,D,C,A,C,B,B,B,C,A,A,B,C,D,D,B,A,B,A,A,A,A,B,C,A,B,A,B,B,C,D',
  'XXII':   'D,A,B,D,B,A,B,C,B,D,A,D,C,D,C,B,A,B,B,D,D,A,C,D,A,D,B,C,C,A,C,D,A,D,A,C,A,D,D,A,B,B,D,D,A,D,B,B,B,C,D,C,C,B,C,C,D,C,A,A,B,D,C,A,C,B,B,B,A,B,A,A,A,C,D,C,C,A,C,B',
  'XXIII':  'D,C,A,C,A,A,B,C,D,A,D,B,B,B,A,C,A,D,B,B,C,D,C,A,B,D,C,D,A,D,A,A,D,D,A,C,A,C,A,C,B,B,D,D,C,B,C,D,C,B,D,B,C,C,C,B,C,B,B,C,D,B,D,C,D,B,D,C,D,C,B,D,C,A,A,D,C,D,A,A',
  'XXIV':   'D,B,A,C,C,C,A,D,B,C,D,B,B,A,B,B,C,C,D,C,B,B,B,C,D,B,C,D,D,B,C,A,B,B,D,A,D,C,D,B,B,C,D,A,A,A,C,D,A,B,B,D,C,D,C,B,B,C,A,A,D,B,D,A,C,B,C,D,A,A,C,D,C,B,D,A,A,A,D,A',
  'XXV':    'B,D,C,D,C,D,A,C,A,B,A,C,B,D,C,C,C,D,A,A,B,D,C,D,C,B,C,C,A,B,D,D,A,B,D,B,A,D,B,B,A,D,C,C,A,A,B,B,A,B,A,B,B,C,B,D,C,C,D,A,A,D,A,B,B,B,A,C,D,C,A,B,A,A,A,A,C,B,B,A',
  'XXVI':   'C,C,B,C,A,A,B,C,B,D,D,A,C,B,C,A,C,B,C,A,D,A,C,D,B,D,D,A,B,B,C,D,B,C,C,A,C,D,B,A,D,D,B,A,A,C,A,A,D,C,D,D,A,D,A,B,B,D,D,A,C,B,D,A,D,B,C,D,C,C,A,B,D,B,B,A,C,A,C,B',
  'XXVII':  'A,C,C,D,D,D,B,A,D,C,C,A,A,B,C,D,B,D,B,C,D,B,B,C,A,A,A,D,B,C,A,B,A,C,B,C,A,C,A,B,D,A,B,D,A,D,B,D,A,B,C,D,A,D,A,C,B,C,B,C,B,D,D,B,D,C,A,B,C,D,A,D,A,A,C,B,A,D,C,C',
  'XXVIII': 'D,B,B,A,C,A,D,D,A,B,D,B,A,D,C,D,A,C,D,B,C,D,A,A,C,B,C,A,A,D,A,C,C,D,B,C,D,A,B,D,C,D,B,D,B,A,B,C,B,C,C,A,B,B,D,B,A,C,D,D,A,C,B,B,A,D,A,C,B,D,C,C,B,A,D,A,D,A,C,B',
  'XXIX':   'D,B,B,C,A,D,B,B,C,A,D,C,A,C,B,D,D,B,D,B,B,B,C,B,B,C,A,B,C,A,C,B,B,A,A,A,D,B,C,C,D,A,B,A,C,B,C,A,D,B,C,B,D,D,B,C,B,A,C,D,D,D,D,C,D,C,B,C,A,C,C,D,C,D,D,A,B,C,B,D',
  'XXX':    'C,B,B,C,D,A,A,B,A,A,D,B,D,A,C,B,C,D,C,C,C,D,A,B,D,C,A,D,C,A,C,D,A,B,A,D,B,D,A,C,B,B,A,D,D,B,B,D,C,A,C,D,A,C,C,D,B,D,B,C,B,C,A,A,C,D,B,D,D,B,A,D,A,B,A,C,B,A,B,C',
  'XXXI':   'D,B,B,D,A,B,D,B,A,A,B,A,B,D,C,C,A,A,D,C,D,D,B,D,B,B,A,D,A,D,B,A,D,D,A,C,B,D,C,D,C,C,D,A,B,A,C,D,A,A,B,D,D,C,C,B,B,A,D,C,C,C,C,C,B,C,C,D,A,B,A,C,B,A,A,B,B,C,B,D',
  'XXXII':  'C,B,D,B,B,B,D,A,D,D,B,C,B,D,A,D,B,B,A,D,A,B,C,D,B,B,C,D,C,A,D,C,A,D,C,C,A,D,A,C,A,A,B,C,C,A,B,D,C,C,B,C,C,A,B,A,D,C,D,C,D,B,A,B,D,C,D,D,A,A,C,C,B,C,A,B,B,B,B,A',
  'XXXIII': 'D,D,D,D,B,C,A,C,D,C,A,A,B,D,C,C,D,A,C,C,C,B,C,D,B,A,A,A,C,B,B,A,B,B,C,C,A,C,D,A,A,C,B,B,B,A,B,C,C,D,C,A,C,B,C,B,D,D,A,D,C,D,A,B,A,C,D,D,C,B,D,A,A,B,A,D,D,D,A,B',
  'XXXIV':  'B,C,A,B,D,A,C,B,D,C,A,D,B,A,D,A,D,C,D,B,B,D,D,B,A,D,C,D,C,C,A,B,D,B,C,A,B,B,B,B,B,A,C,A,C,B,D,C,C,C,B,C,B,D,A,A,A,B,B,A,A,D,C,C,D,B,C,C,C,B,C,B,A,D,B,D,D,A,A,D',
  'XXXV':   'C,D,B,D,C,C,B,A,B,B,B,B,B,D,C,A,B,C,B,B,C,C,B,C,C,A,B,A,A,C,A,B,B,D,D,C,D,D,D,B,C,C,A,D,B,C,D,D,A,ANULADA,A,B,C,C,D,A,C,C,ANULADA,D,A,A,C,C,B,D,D,B,D,C,C,B,B,B,A,A,A,A,A,C',
  'XXXVI':  'B,A,D,D,B,C,D,D,A,B,C,B,D,B,C,A,A,A,D,B,D,C,C,C,B,A,D,A,D,B,C,D,B,A,D,C,B,B,B,B,D,B,B,D,C,A,D,B,A,C,A,D,C,A,C,A,C,B,C,D,C,A,C,D,A,B,D,A,D,B,C,C,A,A,A,C,A,B,C,A',
  'XXXVII': 'D,D,B,D,B,C,ANULADA,A,D,C,D,B,A,B,C,B,B,D,D,A,C,A,B,C,C,B,D,A,D,A,D,D,D,A,C,B,B,C,A,C,B,B,D,D,C,A,C,D,A,C,C,C,B,C,D,B,B,A,C,D,A,B,D,D,B,C,A,C,ANULADA,A,A,A,D,B,B,A,B,A,D,B',
  'XXXVIII':'C,D,B,A,C,B,D,B,A,A,D,C,A,C,C,A,C,C,D,B,B,A,D,B,C,D,A,D,C,D,A,D,A,D,D,C,D,A,C,D,B,A,C,C,B,A,A,D,B,A,B,C,D,D,A,B,A,B,B,D,B,B,C,C,A,B,C,C,A,B,D,D,B,B,B,C,A,C,A,D',
  'XXXIX':  'A,D,D,C,A,D,B,A,D,D,C,B,A,C,A,B,B,C,A,C,B,A,C,A,C,D,A,D,C,D,A,D,C,A,B,C,C,D,B,D,C,D,B,B,C,B,A,B,D,A,B,D,C,D,D,D,A,B,B,B,D,A,C,C,D,A,A,C,C,B,D,B,B,A,B,C,B,A,A,C',
  'XL':     'B,C,A,C,A,C,D,A,B,C,B,D,B,B,B,D,A,B,D,A,D,B,A,C,A,C,D,D,B,C,D,B,D,D,A,C,B,C,C,B,C,A,D,C,D,C,B,A,A,C,B,D,B,A,D,C,A,B,D,A,D,A,C,C,A,B,A,B,C,A,B,A,C,D,D,D,C,C,B,A',
  'XLI':    'B,A,B,D,A,B,C,C,B,B,B,C,B,B,B,A,A,B,C,B,A,B,A,C,D,C,D,C,B,C,D,A,D,C,C,D,D,B,D,A,D,D,A,B,A,A,C,D,A,B,D,D,B,B,C,A,D,C,D,A,D,C,A,A,C,A,C,C,D,A,A,C,D,C,B,C,D,B,A,A',
  'XLII':   'D,B,D,A,D,B,C,A,D,A,B,A,D,A,D,D,A,B,B,D,B,D,C,B,C,C,A,A,C,B,C,A,A,D,C,A,D,B,C,B,D,C,ANULADA,C,C,B,C,A,A,D,B,C,D,B,C,B,C,A,C,C,A,C,B,A,B,A,D,C,A,B,C,C,D,B,C,A,D,A,D,B',
  'XLIII':  'ANULADA,C,A,A,C,B,D,C,B,D,D,B,B,A,B,C,C,A,D,D,C,C,D,B,C,B,A,B,A,D,C,A,A,C,D,B,B,A,B,A,C,B,B,D,A,D,A,B,D,A,C,D,C,A,B,B,C,D,C,A,D,C,D,B,A,D,A,B,B,D,C,B,A,ANULADA,D,C,C,A,D,A',
  'XLIV':   'C,B,B,A,C,B,C,C,A,D,C,D,C,D,D,B,D,A,D,C,D,A,B,C,C,C,D,B,A,D,A,A,D,C,B,A,D,C,C,A,D,B,A,A,B,A,C,B,B,A,C,D,A,A,B,D,D,D,B,C,D,C,B,D,C,B,A,B,A,A,D,C,B,A,C,A,D,B,B,A',
  'XLV':    'A,A,C,C,B,A,D,B,B,C,C,D,B,A,D,A,B,A,C,A,D,C,A,D,B,C,B,B,D,B,D,A,A,D,D,C,C,D,A,A,B,D,D,C,B,D,B,C,A,C,B,C,D,A,B,D,D,C,D,C,A,B,C,A,B,C,B,D,A,D,A,D,D,B,D,C,B,B,A,A',
  'XLVI':   'C,D,C,A,D,A,C,D,B,C,C,B,B,D,C,D,B,D,A,A,D,C,A,C,B,D,B,C,D,D,A,B,B,A,C,A,A,D,B,B,A,B,D,C,B,D,A,B,C,C,B,C,C,C,A,B,B,D,A,A,B,C,D,B,D,B,A,B,B,A,D,D,A,A,C,C,D,A,D,B',
}

// Gabaritos extraídos dos PDFs de gabarito para exames I-VI (sem OCR)
// Serão lidos dos PDFs de gabarito na função parseGabaritoAnswers()
const GAB_MISSING = new Set(['I', 'III', 'IV', 'V', 'VI'])

// ─── EXAM CATALOG ─────────────────────────────────────────────────────────────

const EXAM_CATALOG = [
  { number:1,  numeral:'I',       year:2010, semester:1, examDate:'2010-04-18' },
  { number:2,  numeral:'II',      year:2010, semester:2, examDate:'2010-10-10' },
  { number:3,  numeral:'III',     year:2011, semester:1, examDate:'2011-04-10' },
  { number:4,  numeral:'IV',      year:2011, semester:2, examDate:'2011-08-21' },
  { number:5,  numeral:'V',       year:2011, semester:2, examDate:'2011-12-18' },
  { number:6,  numeral:'VI',      year:2012, semester:1, examDate:'2012-04-22' },
  { number:7,  numeral:'VII',     year:2012, semester:2, examDate:'2012-08-26' },
  { number:8,  numeral:'VIII',    year:2012, semester:2, examDate:'2012-12-09' },
  { number:9,  numeral:'IX',      year:2012, semester:2, examDate:'2012-12-16' },
  { number:10, numeral:'X',       year:2013, semester:1, examDate:'2013-04-21' },
  { number:11, numeral:'XI',      year:2013, semester:2, examDate:'2013-08-25' },
  { number:12, numeral:'XII',     year:2013, semester:2, examDate:'2013-12-08' },
  { number:13, numeral:'XIII',    year:2014, semester:1, examDate:'2014-04-27' },
  { number:14, numeral:'XIV',     year:2014, semester:2, examDate:'2014-08-24' },
  { number:15, numeral:'XV',      year:2014, semester:2, examDate:'2014-12-07' },
  { number:16, numeral:'XVI',     year:2015, semester:1, examDate:'2015-04-26' },
  { number:17, numeral:'XVII',    year:2015, semester:2, examDate:'2015-08-23' },
  { number:18, numeral:'XVIII',   year:2015, semester:2, examDate:'2015-12-13' },
  { number:19, numeral:'XIX',     year:2016, semester:1, examDate:'2016-04-24' },
  { number:20, numeral:'XX',      year:2016, semester:2, examDate:'2016-08-21' },
  { number:21, numeral:'XXI',     year:2016, semester:2, examDate:'2016-12-11' },
  { number:22, numeral:'XXII',    year:2017, semester:1, examDate:'2017-04-23' },
  { number:23, numeral:'XXIII',   year:2017, semester:2, examDate:'2017-08-27' },
  { number:24, numeral:'XXIV',    year:2017, semester:2, examDate:'2017-12-10' },
  { number:25, numeral:'XXV',     year:2018, semester:1, examDate:'2018-04-22' },
  { number:26, numeral:'XXVI',    year:2018, semester:2, examDate:'2018-08-19' },
  { number:27, numeral:'XXVII',   year:2018, semester:2, examDate:'2018-12-09' },
  { number:28, numeral:'XXVIII',  year:2019, semester:1, examDate:'2019-04-28' },
  { number:29, numeral:'XXIX',    year:2019, semester:2, examDate:'2019-08-25' },
  { number:30, numeral:'XXX',     year:2019, semester:2, examDate:'2019-12-08' },
  { number:31, numeral:'XXXI',    year:2020, semester:1, examDate:'2020-10-25' },
  { number:32, numeral:'XXXII',   year:2021, semester:1, examDate:'2021-05-02' },
  { number:33, numeral:'XXXIII',  year:2021, semester:2, examDate:'2021-08-22' },
  { number:34, numeral:'XXXIV',   year:2022, semester:1, examDate:'2022-04-24' },
  { number:35, numeral:'XXXV',    year:2022, semester:2, examDate:'2022-08-21' },
  { number:36, numeral:'XXXVI',   year:2022, semester:2, examDate:'2022-12-11' },
  { number:37, numeral:'XXXVII',  year:2023, semester:1, examDate:'2023-04-23' },
  { number:38, numeral:'XXXVIII', year:2023, semester:2, examDate:'2023-08-20' },
  { number:39, numeral:'XXXIX',   year:2023, semester:2, examDate:'2023-12-10' },
  { number:40, numeral:'XL',      year:2024, semester:1, examDate:'2024-04-28' },
  { number:41, numeral:'XLI',     year:2024, semester:2, examDate:'2024-08-25' },
  { number:42, numeral:'XLII',    year:2024, semester:2, examDate:'2024-12-08' },
  { number:43, numeral:'XLIII',   year:2025, semester:1, examDate:'2025-04-27' },
  { number:44, numeral:'XLIV',    year:2025, semester:2, examDate:'2025-08-24' },
  { number:45, numeral:'XLV',     year:2025, semester:2, examDate:'2025-12-07' },
  { number:46, numeral:'XLVI',    year:2026, semester:1, examDate:'2026-04-27' },
]

// ─── KEYWORD CLASSIFIER ───────────────────────────────────────────────────────

const DISCIPLINES = [
  {
    name: 'Estatuto da Advocacia e Ética Profissional',
    keywords: [
      'estatuto da advocacia','sigilo profissional','substabelecimento',
      'seccional','tribunal de ética','infração disciplinar',
      'infrações disciplinares','pretensão punitiva',
      'cancelamento da inscrição','suspensão preventiva','código de ética',
      'exclusão da ordem','inscrição na oab','exercício da advocacia',
      'prerrogativa do advogado','imunidade profissional','incompatibilidade',
      'impedimento do advogado','anuidade','carteira da oab',
      'honorários advocatícios','cláusula de honorários',
      'mandato judicial','procuração ad judicia','substabelecente',
      'ética profissional','sigilo','ordem dos advogados',
      'advogado','advogada','advocacia','oab',
      'renúncia ao mandato','renunciar ao mandato','mandato do advogado',
    ],
  },
  {
    name: 'Direito Constitucional',
    keywords: [
      'constituição federal','constitucional','inconstitucional','stf','adi',
      'adpf','adc','mandado de injunção','poder constituinte',
      'emenda constitucional','emendas constitucionais',
      'direitos fundamentais','direitos sociais','controle de constitucionalidade',
      'intervenção federal','intervenção estadual','processo legislativo',
      'competência privativa','competência legislativa concorrente',
      'imunidade parlamentar','ação popular','habeas data','habeas corpus',
      'mandado de segurança',
      'súmula vinculante','repercussão geral','recurso extraordinário',
      'medida provisória','lei complementar','estado de defesa','estado de sítio',
      'poder legislativo','senado federal','câmara dos deputados',
      'poder executivo','poder judiciário','funções essenciais',
      'ministério público','defensoria pública','advocacia-geral da união',
      'jus cogens','pacto internacional','convenção americana',
      'organização do estado','separação dos poderes',
      'iniciativa popular','elegibilidade','inelegível','inelegíveis',
      'inalistável','inalistáveis',
      'foro por prerrogativa de função','prerrogativa de função',
      'partido político','partidos políticos','sistema eleitoral',
      'fidelidade partidária','eleições','cargo eletivo',
      'liberdade de associação','liberdade de reunião','liberdade de expressão',
      'saúde pública','sistema único de saúde','seguridade social',
      'procurador-geral de justiça','procurador-geral da república',
      'procuradores-gerais','procurador geral',
      'assembleias legislativas','assembleia legislativa',
      'ministro de estado','ministros de estado',
      'tratados internacionais','decreto legislativo',
      'naturalização','naturalizado','nacionalidade','emancipação',
      'elegíveis',
      'crfb','direito de reunião','deliberação plenária',
      'convicção filosófica','convicção política',
      'reunir-se','reuniões',
    ],
  },
  {
    name: 'Direito Administrativo',
    keywords: [
      'administração pública','ato administrativo','licitação','pregão',
      'concurso público','servidor público','poder de polícia','desapropriação',
      'improbidade administrativa','agência reguladora','concessão de serviço',
      'permissão administrativa','autorização administrativa',
      'tcu','tribunal de contas','impessoalidade','legalidade administrativa',
      'moralidade administrativa','eficiência','ato vinculado','ato discricionário',
      'hierarquia administrativa','processo administrativo','tombamento',
      'servidão administrativa','limitações administrativas','ocupação temporária',
      'empresa pública','sociedade de economia mista','entidade pública',
      'consórcio público','convênio administrativo','autarquia','fundação pública',
      'responsabilidade do estado','precatório','dívida pública',
      'órgão público','órgãos públicos','atos administrativos',
      'vacância de cargo','controle interno',
      'saneamento básico','plano diretor','zoneamento',
      'regime diferenciado de contratação','concessão florestal',
      'serviço público uti singuli','serviços públicos uti singuli',
      'serviço público uti universi',
      'licença de instalação','licença ambiental','licenciamento ambiental',
      'meio ambiente','ecossistema','reserva legal','mata atlântica',
      'floresta amazônica','código florestal','rppn',
      'proteção ambiental','área de proteção ambiental',
      'zona costeira','pantanal','unidades de conservação',
      'política ambiental','impacto ambiental','ecoturismo',
      'servidores públicos','promoção de servidores',
      'protocolo de intenções',
      'agente público','agentes públicos',
      'responsabilidade objetiva','responsabilidade do agente',
      'política pública ambiental',
      'reservas legais','área de preservação permanente','áreas de preservação permanente',
      'poder público municipal',
      'infração administrativa',
      'direito de regresso','policial militar',
      'hospital estadual','hospital psiquiátrico',
      'contratada pelo município','contratada pelo poder público',
    ],
  },
  {
    name: 'Direito Civil',
    keywords: [
      'código civil','negócio jurídico','pessoa natural','capacidade civil',
      'contrato de compra e venda','contrato de locação','responsabilidade civil',
      'dano moral','dano material','posse','propriedade','usucapião',
      'herança','sucessão','testamento','doação','prescrição civil','decadência',
      'obrigações','solidariedade','cessão de crédito','fiduciária',
      'família','casamento','divórcio','união estável','alimentos','filiação',
      'tutela civil','curatela','bem de família','contrato','locatário',
      'locador','comprador','vendedor','hipoteca','penhor','anticrese',
      'dano','indenização','reparação','culpa civil','dolo civil',
      'código de defesa do consumidor','cdc','consumidor','fornecedor',
      'vício do produto','relação de consumo','direito do consumidor',
      'usufruto','usufrutuário','usufruto vitalício',
      'condomínio','condomínio edilício',
      'servidão de passagem','servidão de aqueduto','servidão predial',
      'comodato','comodatário','mútuo',
      'adoção','poder familiar','guarda judicial','estatuto da criança',
      'criança e do adolescente','internação de menor','conselheiro tutelar',
      'inventariante','inventário','direito sucessório','espólio',
      'promessa de recompensa','arrendamento',
      'regime de comunhão','regime de separação de bens',
      'casar','nupcial','separação obrigatória','separação convencional',
      'partes comuns','benfeitorias','comodatário',
      'edifício','apartamento','ação de vizinhança','dano à propriedade',
      'escritura de imóvel','registro de imóvel',
      'incapacidade absoluta','incapacidade relativa',
      'adolescente','menor de idade',
      'assembleia geral','associação civil',
      'evicção','solidariamente',
      'ação reivindicatória','ação reinvindicatória',
      'operadora de viagens','pacote de viagem',
    ],
  },
  {
    name: 'Direito Processual Civil',
    keywords: [
      'cpc','código de processo civil','petição inicial','contestação',
      'litisconsórcio','intervenção de terceiros','tutela antecipada',
      'tutela de urgência','liminar','processo de execução',
      'embargos à execução','penhora','citação','intimação','recurso de apelação',
      'agravo de instrumento','embargos de declaração','coisa julgada material',
      'julgamento antecipado','audiência de instrução','laudo pericial',
      'ação de despejo','ação de cobrança','ação possessória',
      'cumprimento de sentença','preclusão','nulidade processual civil',
      'ação rescisória','revelia','reconvenção',
      'incompetência absoluta','incompetência relativa',
      'uniformização de jurisprudência','juizados especiais',
      'processo eletrônico','arresto','sequestro judicial',
      'ação civil pública','tutela coletiva',
      'incidente de resolução de demandas repetitivas','irdr',
      'recurso adesivo','substituição processual',
      'demanda reivindicatória','fixação de competência',
      'critérios de competência','recursos especiais','recurso especial','stj',
      'nunciação de obra nova',
    ],
  },
  {
    name: 'Direito Penal',
    keywords: [
      'código penal','crime','delito','tipicidade','antijuridicidade','culpabilidade',
      'dolo penal','culpa penal','excesso de legítima defesa','estado de necessidade',
      'legítima defesa','reclusão','detenção','pena privativa','concurso de crimes',
      'prescrição penal','extinção da punibilidade','extintiva da punibilidade',
      'crime hediondo',
      'peculato','corrupção passiva','corrupção ativa','estelionato','furto',
      'roubo','homicídio','lesão corporal','tráfico de drogas','lavagem de dinheiro',
      'concurso material','concurso formal','crime continuado',
      'tentativa','desistência voluntária','arrependimento eficaz',
      'imputabilidade','semi-imputabilidade','inimputabilidade',
      'princípio da insignificância','feminicídio','abolitio criminis',
      'extraterritorialidade penal',
      'estupro de vulnerável','vulnerável','porte de arma','arma de fogo',
      'pirataria','pirata','crimes militares','justiça militar',
      'disparo de arma','lesão corporal culposa',
      'lei penal brasileira','aberratio ictus','erro sobre a pessoa','aberratio criminis',
      'relações sexuais','conduta típica','conduta ilícita',
    ],
  },
  {
    name: 'Direito Processual Penal',
    keywords: [
      'código de processo penal','cpp','inquérito policial','ação penal pública',
      'ação penal privada','denúncia','queixa-crime','prisão em flagrante',
      'prisão preventiva','prisão temporária','liberdade provisória','fiança',
      'prova ilícita','júri','tribunal do júri','sentença absolutória',
      'recurso em sentido estrito','apelação criminal','réu','acusado',
      'defesa criminal','promotor de justiça','ministério público criminal',
      'ação penal','auto de prisão em flagrante',
    ],
  },
  {
    name: 'Direito do Trabalho',
    keywords: [
      'clt','consolidação das leis do trabalho','contrato de trabalho',
      'empregado','empregador','relação de emprego','aviso prévio',
      'fgts','rescisão contratual','horas extras','jornada de trabalho',
      '13º salário','férias trabalhistas','salário','remuneração',
      'adicional noturno','adicional de periculosidade','adicional de insalubridade',
      'estabilidade provisória','gestante','cipeiro','terceirização trabalhista',
      'trabalho rural','aprendiz','estagiário','relação empregatícia',
      'subordinação jurídica','pessoalidade','onerosidade','não eventualidade',
      'dispensa','demissão','admissão',
      'sindicato','negociação coletiva','convenção coletiva','acordo coletivo',
      'previdência social','rgps','inss','aposentadoria','auxílio-doença',
      'benefício previdenciário','auxílio-acidente','salário-maternidade',
      'acidente de trabalho','doença ocupacional',
      'trabalhador avulso','vínculo empregatício',
    ],
  },
  {
    name: 'Direito Processual do Trabalho',
    keywords: [
      'trt','tst','vara do trabalho','reclamação trabalhista','dissídio coletivo',
      'dissídio individual','execução trabalhista','rito sumaríssimo',
      'recurso de revista','embargos trabalhistas','jus postulandi',
      'comissão de conciliação prévia','ata de audiência trabalhista',
      'processo trabalhista','juízo trabalhista',
      'justiça do trabalho','processo do trabalho',
      'justi ça do trabalho',
      'custas no processo do trabalho','despesas processuais trabalhistas',
      'nulidade trabalhista','nulidade no processo do trabalho',
    ],
  },
  {
    name: 'Direito Empresarial',
    keywords: [
      'código comercial','empresário individual','sociedade empresária',
      'sociedade limitada','sociedade anônima','s.a.','ltda','cnpj',
      'falência','recuperação judicial','recuperação extrajudicial',
      'cheque','nota promissória','letra de câmbio','título de crédito',
      'duplicata','endosso','aval','marca','patente','propriedade industrial',
      'concorrência desleal','fundo de comércio','estabelecimento empresarial',
      'franquia','representação comercial','registro comercial',
      'registro de empresa','junta comercial','ações da empresa',
      'cotista','sócio','dissolução societária','liquidação',
      'eireli','empresa individual de responsabilidade limitada',
      'sociedade cooperativa','cooperativa',
      'cade','concentração econômica','antitruste','posição dominante',
      'ações preferenciais','ações ordinárias','dividendos',
      'companhia aberta','companhia fechada',
      'sociedades anônimas','sociedades empresárias','sociedades limitadas',
      'empresas individuais',
      'fusão','incorporação societária','cisão societária',
      'sociedade simples','sociedade em comum','sociedade em conta de participação',
    ],
  },
  {
    name: 'Direito Tributário',
    keywords: [
      'tributo','imposto','taxa','contribuição de melhoria','icms','iss',
      'iptu','ipva','ipi','irpf','irpj','cofins','pis','csll','ctn',
      'código tributário nacional','lançamento tributário','crédito tributário',
      'imunidade tributária','isenção tributária','substituição tributária',
      'receita federal','dívida ativa tributária','execução fiscal',
      'certidão negativa','simples nacional','parcelamento tributário',
      'contribuinte','fato gerador','base de cálculo','alíquota',
      'itr','iof','itbi','itcmd','iss','obrigação tributária',
      'auto de infração','notificação fiscal',
      'custas judiciais','emolumentos cartorários',
    ],
  },
  {
    name: 'Filosofia do Direito e Teoria Geral do Direito',
    keywords: [
      'aristóteles','platão','sócrates','kant','kelsen','bentham','bobbio',
      'dworkin','hart','ihering','larenz','locke','rousseau','hobbes',
      'montesquieu','rawls','hegel','habermas','arendt','nozick',
      'utilitarismo','positivismo jurídico','jusnaturalismo',
      'teoria pura do direito','filosofia do direito','teoria geral do direito',
      'hermenêutica jurídica','hermenêutica aplicada','lacuna no direito',
      'fontes do direito','direito natural','direito positivo',
      'validade da norma','princípio da utilidade','fundamento do direito',
      'dialética','historicismo','fato histórico-cultural',
      'teoria do ordenamento jurídico','lacunas do direito','lacuna na lei',
    ],
  },
  {
    name: 'Direito Internacional e Direitos Humanos',
    keywords: [
      'mercosul','tratado de assunção','organização mundial do comércio','omc',
      'nações unidas','assembleia geral da onu','carta das nações unidas',
      'conselho de segurança da onu',
      'convenção de viena','direito dos tratados',
      'direito internacional humanitário','convenções de genebra',
      'convenção de genebra','corte internacional de justiça',
      'refugiado','conare','acnur','convenção dos refugiados',
      'corte interamericana de direitos humanos',
      'imunidade diplomática','imunidade consular',
      'extradição','asilo político',
      'direito internacional público','direito internacional privado',
      'convenção interamericana','convenção das nações unidas',
      'sistema interamericano de direitos humanos',
      'relator especial das nações unidas','tribunal penal internacional',
      'direitos humanos','declaração universal',
      'conselho nacional dos direitos humanos',
      'capital estrangeiro','investimento estrangeiro',
      'controvérsia internacional','consulado','interpol',
      'desaparecimento forçado','tortura','convenção contra a tortura',
      'naturalização','naturalizado','nacionalidade',
    ],
  },
]

function classify(text) {
  const lower = text.toLowerCase().replace(/  +/g, ' ')  // collapse multi-spaces from PDF column layout
  const scores = DISCIPLINES.map(d => {
    let score = 0
    for (const kw of d.keywords) {
      if (lower.includes(kw)) score++
    }
    return { name: d.name, score }
  })
  scores.sort((a, b) => b.score - a.score)
  return scores[0].score > 0 ? scores[0].name : 'Não classificada'
}

// ─── GABARITO PARSER (for missing exams I/III/IV/V/VI) ───────────────────────

async function parseGabaritoAnswers(numeral) {
  const gabPath = path.join(GAB_DIR, `${numeral}.pdf`)
  if (!fs.existsSync(gabPath)) return null
  const text = await getPdfText(gabPath)
  if (!text || isGarbled(text)) return null

  // Look for answer table: lines like "01 A" or "01 - A" or sequences like A B C D
  const answers = {}

  // Pattern: number followed by letter answer
  const re = /\b(0?[1-9]|[1-7]\d|80)\s*[-–]?\s*([ABCD])\b/g
  let m
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1])
    const ans = m[2].toLowerCase()
    if (num >= 1 && num <= 80 && !answers[num]) answers[num] = ans
  }

  // Return as 80-element array
  if (Object.keys(answers).length < 10) return null
  const arr = []
  for (let i = 1; i <= 80; i++) arr.push(answers[i] || '')
  return arr
}

// ─── PLACEHOLDER QUESTIONS for missing / garbled exams ───────────────────────

function makePlaceholders(numeral, gabAnswers, rawQuestions) {
  const qs = []
  for (let i = 1; i <= 80; i++) {
    const raw = rawQuestions ? rawQuestions.find(q => q.number === i) : null
    qs.push({
      number: i,
      statement: raw ? raw.statement || '' : '',
      alternatives: (raw && raw.alternatives) ? raw.alternatives : { a:'', b:'', c:'', d:'' },
      correctAnswer: gabAnswers ? (gabAnswers[i-1] || '') : (raw ? raw.correctAnswer || '' : ''),
    })
  }
  return qs
}

// ─── ALT REPAIR ───────────────────────────────────────────────────────────────
// For alternatives that don't end with terminal punctuation, re-search the raw
// PDF text to find the complete, untruncated version.

function findCompleteAlt(rawText, truncated) {
  if (!truncated || truncated.length < 6) return null

  // Use up to 45 chars as search key — long enough to be unique across the exam
  const keyLen = Math.min(45, truncated.length)
  const key = truncated.slice(0, keyLen).replace(/\s+/g, ' ').trim()

  let idx = rawText.indexOf(key)
  if (idx < 0) {
    const short = key.slice(0, Math.min(20, key.length))
    idx = rawText.indexOf(short)
  }
  if (idx < 0) return null

  // 1000-char window from the found position (enough for one alternative)
  const win = rawText.slice(idx, idx + 1000)

  // Strategy: find the START of the NEXT alternative or question and cut there.
  // This avoids capturing text from subsequent alternatives.
  // Search from char 5 to skip the very beginning of the current alt text.
  const searchArea = win.slice(5)
  const boundaryPatterns = [
    /[\r\n]\s*[ABCD]\s*\)/,           // A) format at line start
    /[\r\n]\s*\([ABCD]\s*\)/,         // (A) format at line start
    /[\r\n][ABCD][A-ZÁÀÂÃÉÊÍÓÔÕÚ]/,  // fused Aword format (Exam I)
    /[\r\n]\s*Questão\s+\d/i,         // Questão N
    /[\r\n]\s*QUEST[AÃ]O\s+\d/i,     // QUESTÃO N
    /[\r\n]\s*\d{1,2}\s*[\r\n]/,     // standalone number on its own line
  ]

  let earliest = -1
  for (const pat of boundaryPatterns) {
    const m = searchArea.search(pat)
    if (m >= 0 && (earliest < 0 || m < earliest)) earliest = m
  }

  // Cut the window at the boundary (or use the whole window if no boundary found)
  const cutPos = earliest >= 0 ? 5 + earliest : win.length
  const fullRaw = win.slice(0, cutPos).replace(/\s+/g, ' ').trim()
  const cleaned = cleanAlt(fullRaw)

  // Accept if at least as long as truncated (period check handled by caller)
  if (cleaned.length >= truncated.length) {
    return cleaned
  }

  return null
}

function repairBadAlts(questions, rawText, numeral) {
  const TERMINAL = /[.!?;,)"'""'']$/
  let count = 0
  for (const q of questions) {
    for (const letter of ['a', 'b', 'c', 'd']) {
      const alt = q.alternatives[letter]
      if (!alt || alt.trim() === '') continue
      const trimmed = alt.trim()
      if (TERMINAL.test(trimmed)) continue
      if (trimmed.length < 5) continue  // skip near-empty / pure garbage

      // Try to get the most complete version from the PDF
      let base = trimmed
      if (rawText) {
        const fromPdf = findCompleteAlt(rawText, trimmed)
        if (fromPdf) base = fromPdf
      }

      // Add terminal period if still missing
      const finalAlt = TERMINAL.test(base) ? base : base + '.'
      q.alternatives[letter] = finalAlt
      count++
      if (base !== trimmed)
        console.log(`    extended Q${q.number}${letter}: ...${finalAlt.slice(-55)}`)
      else
        console.log(`    period   Q${q.number}${letter}: ...${finalAlt.slice(-55)}`)
    }
  }
  if (count > 0) console.log(`  ✓ ${count} alternatives updated`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const PHASE2_PATH = path.join(DATA_DIR, 'phase2-classified.json')

async function main() {
  // Load existing raw data for fallback
  const rawData = fs.existsSync(RAW_PATH)
    ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
    : []
  const rawByNumeral = {}
  for (const e of rawData) rawByNumeral[e.numeral] = e

  // Load phase2 data as last-resort fallback for garbled exams
  const phase2Data = fs.existsSync(PHASE2_PATH)
    ? JSON.parse(fs.readFileSync(PHASE2_PATH, 'utf8'))
    : []
  const phase2ByNumeral = {}
  for (const e of phase2Data) phase2ByNumeral[e.numeral] = e

  const result = []

  for (const exam of EXAM_CATALOG) {
    const { numeral, number, year, semester, examDate } = exam
    console.log(`\n── Exam ${numeral} ──`)

    const provaPath = path.join(PROVAS_DIR, `${numeral}.pdf`)
    const rawExam   = rawByNumeral[numeral]
    let questions   = []
    let provaText   = null   // raw PDF text kept for alt-repair pass

    // Phase 1: parse PDF
    if (fs.existsSync(provaPath)) {
      const text = await getPdfText(provaPath)
      if (!text) {
        console.log(`  [warn] empty text, falling back to raw`)
      } else if (isGarbled(text)) {
        console.log(`  [warn] garbled text (encoding issue)`)
      } else {
        provaText = text
        questions = parseBest(text, numeral)
        console.log(`  parsed ${questions.length} questions from PDF`)
      }
    } else {
      console.log(`  [warn] PDF not found: ${provaPath}`)
    }

    // Phase 2: apply gabaritos
    let gabAnswers = null
    if (GABARITOS[numeral]) {
      gabAnswers = GABARITOS[numeral].split(',').map(a => a === 'ANULADA' ? '' : a.toLowerCase())
    } else if (GAB_MISSING.has(numeral)) {
      gabAnswers = await parseGabaritoAnswers(numeral)
      if (gabAnswers) console.log(`  parsed gabarito from PDF for ${numeral}`)
    }

    // Merge: if parsed < 40 questions, supplement from raw then phase2
    if (questions.length < 40) {
      console.log(`  [warn] only ${questions.length} parsed — supplementing with raw/phase2 data`)
      const parsedNums = new Set(questions.map(q => q.number))

      // Try raw data first (re-extract alternatives from embedded statements)
      if (rawExam) {
        for (const rq of (rawExam.questions || [])) {
          if (!parsedNums.has(rq.number)) {
            const ex = extractAlts(rq.statement || '')
            questions.push({ number: rq.number, statement: ex.statement, alternatives: ex.alternatives })
            parsedNums.add(rq.number)
          }
        }
      }

      // Then try phase2 for questions still missing alternatives
      const phase2Exam = phase2ByNumeral[numeral]
      if (phase2Exam) {
        for (const pq of (phase2Exam.questions || [])) {
          const existing = questions.find(q => q.number === pq.number)
          const hasAlts = existing && Object.values(existing.alternatives).some(v => v.length > 5)
          if (!hasAlts && pq.alternatives && Object.values(pq.alternatives).some(v => v.length > 5)) {
            if (existing) {
              existing.statement   = existing.statement || pq.statement || ''
              existing.alternatives = pq.alternatives
            } else {
              questions.push({ number: pq.number, statement: pq.statement || '', alternatives: pq.alternatives })
              parsedNums.add(pq.number)
            }
          }
        }
      }

      questions.sort((a, b) => a.number - b.number)
    }

    // Ensure 80 questions
    if (questions.length < 80) {
      const have = new Set(questions.map(q => q.number))
      for (let i = 1; i <= 80; i++) {
        if (!have.has(i)) {
          const rq = rawExam ? (rawExam.questions || []).find(q => q.number === i) : null
          questions.push({
            number: i,
            statement: rq ? rq.statement || '' : '',
            alternatives: { a:'', b:'', c:'', d:'' },
          })
        }
      }
      questions.sort((a, b) => a.number - b.number)
    }

    // Clean all alternatives (covers fallback data that bypassed parseBest)
    for (const q of questions) {
      for (const k of Object.keys(q.alternatives)) {
        q.alternatives[k] = cleanAlt(q.alternatives[k] || '')
      }
    }

    // Repair alternatives still missing terminal punctuation by re-searching the PDF
    if (provaText) {
      repairBadAlts(questions, provaText, numeral)
    }

    // Apply gabaritos + classify
    let validCount = 0
    for (const q of questions) {
      // Apply answer
      if (gabAnswers && gabAnswers[q.number - 1] !== undefined) {
        q.correctAnswer = gabAnswers[q.number - 1]
      } else if (rawExam) {
        const rq = (rawExam.questions || []).find(r => r.number === q.number)
        q.correctAnswer = rq ? (rq.correctAnswer || '') : ''
      } else {
        q.correctAnswer = ''
      }

      // Classify
      const fullText = `${q.statement} ${Object.values(q.alternatives).join(' ')}`
      q.discipline  = classify(fullText)
      const { tema, microtema } = classifyTema(fullText, q.discipline)
      q.tema        = tema
      q.microtema   = microtema

      const hasAlts = Object.values(q.alternatives).some(v => v.length > 5)
      if (hasAlts) validCount++
    }

    console.log(`  ${validCount}/80 questions have alternatives`)

    result.push({
      number, numeral, year, semester, examDate,
      parseStrategy: 'pdf-reparse',
      questions,
    })
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8')
  console.log(`\n✓ Saved ${result.length} exams to ${OUT_PATH}`)
}

main().catch(err => { console.error(err); process.exit(1) })

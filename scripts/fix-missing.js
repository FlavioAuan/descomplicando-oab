/**
 * Targeted fixes for problematic exams after full-pipeline.js run.
 * Run: node scripts/fix-missing.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const pdf = require('pdf-parse')

const DATA_DIR = path.join(__dirname, 'data')
const PROVAS_DIR = path.join(DATA_DIR, 'pdfs', 'provas')
const OUTPUT_PATH = path.join(DATA_DIR, 'phase1-raw.json')

// ─── GABARITO FOR EXAM I ──────────────────────────────────────────────────────
// Parsed from the official preliminary gabarito PDF.
// ANULADA: Q2, Q11, Q24, Q31, Q33 (per official communique from CESPE/UnB).
const GABARITO_I = 'A,ANULADA,A,A,B,A,D,A,C,D,ANULADA,B,D,C,A,C,D,D,B,C,D,C,A,ANULADA,B,B,D,D,C,B,ANULADA,A,ANULADA,C,A,A,B,C,D,A,C,D,B,B,D,C,B,A,A,B,D,C,D,A,D,D,B,C,D,D,C,D,B,C,A,B,A,B,B,A,B,C,C,C,A,D,C,C,C,D'

// ─── HARDCODED GABARITOS ──────────────────────────────────────────────────────
const GABARITOS = {
  'I':     GABARITO_I,
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

function cleanText(s) {
  return s.replace(/\s+/g, ' ').trim()
}

// Fixed QUESTÃO parser with \s* (allows "Questão29" without space)
function parseWithQuestaoPattern(text) {
  const pattern = /QUEST[AÃ]O\s*(\d+)\s*([\s\S]*?)(?=QUEST[AÃ]O\s*\d+|$)/gi
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

function parseWithNumberedLines(text) {
  const lines = text.split('\n')
  const questions = []
  let current = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const m = line.match(/^(\d{1,2})\s*[-.]?\s*$/)
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
    if (current) current.text += ' ' + line
  }
  if (current && current.text.length > 20) questions.push(current)
  return questions.map(q => ({ ...q, text: cleanText(q.text) }))
}

async function extractText(filePath) {
  const buf = fs.readFileSync(filePath)
  const result = await pdf(buf)
  return result.text
}

async function parseProvaFile(filePath, numeral) {
  let text
  try {
    text = await extractText(filePath)
  } catch (e) {
    return null
  }

  const candidates = [
    () => parseWithQuestaoPattern(text),
    () => parseWithNumberedLines(text),
  ]

  let best = []
  let bestScore = -1

  for (const fn of candidates) {
    try {
      const r = fn()
      const unique = [...new Set(r.map(q => q.number))].length
      if (unique > bestScore) {
        bestScore = unique
        best = r
      }
    } catch (e) {}
  }

  // Deduplicate by number (keep first occurrence)
  const seen = new Set()
  const deduped = best.filter(q => {
    if (seen.has(q.number)) return false
    seen.add(q.number)
    return true
  })
  deduped.sort((a, b) => a.number - b.number)
  return deduped
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    const request = proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); fs.unlinkSync(dest)
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlinkSync(dest)
        reject(new Error(`HTTP ${res.statusCode}`)); return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve(true) })
    })
    request.on('error', (err) => {
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(err)
    })
    request.on('timeout', () => {
      request.destroy(); file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(new Error('Timeout'))
    })
  })
}

async function main() {
  const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))

  // ─── Fix exams with wrong question counts using better parser ──────────────
  // These use QUESTÃO pattern and the \s* fix should recover missing questions
  const toReparse = ['II', 'VIII', 'XXV', 'XXVI', 'XXVII']

  for (const numeral of toReparse) {
    const exam = data.find(e => e.numeral === numeral)
    if (!exam) continue
    const provaPath = path.join(PROVAS_DIR, `${numeral}.pdf`)
    if (!fs.existsSync(provaPath)) { console.log(`${numeral}: no PDF`); continue }

    console.log(`Re-parsing ${numeral}...`)
    const questions = await parseProvaFile(provaPath, numeral)
    if (!questions) { console.log(`  ${numeral}: parse failed`); continue }

    const prevCount = exam.questions.length
    if (questions.length > prevCount) {
      exam.questions = questions.map(q => ({
        number: q.number,
        text: q.text || '',
        options: { a: '', b: '', c: '', d: '' },
        correctAnswer: '',
      }))
      console.log(`  ${numeral}: ${prevCount} → ${questions.length} questions`)
    } else {
      console.log(`  ${numeral}: no improvement (${questions.length} vs ${prevCount})`)
    }
  }

  // ─── XXXV: try harder for missing questions ────────────────────────────────
  {
    const exam = data.find(e => e.numeral === 'XXXV')
    const provaPath = path.join(PROVAS_DIR, 'XXXV.pdf')
    if (exam && fs.existsSync(provaPath)) {
      console.log('Re-parsing XXXV with aggressive numbered lines...')
      const text = await extractText(provaPath)
      const result = parseWithNumberedLines(text)
      const seen = new Set()
      const deduped = result.filter(q => { if (seen.has(q.number)) return false; seen.add(q.number); return true })
      deduped.sort((a, b) => a.number - b.number)
      console.log(`  XXXV: ${deduped.length} unique questions found`)
      if (deduped.length > exam.questions.length) {
        exam.questions = deduped.map(q => ({
          number: q.number, text: q.text || '',
          options: { a: '', b: '', c: '', d: '' }, correctAnswer: '',
        }))
      }
    }
  }

  // ─── XXVIII: try alternative S3 URL ───────────────────────────────────────
  {
    const exam = data.find(e => e.numeral === 'XXVIII')
    const provaPath = path.join(PROVAS_DIR, 'XXVIII.pdf')
    if (exam && exam.questions.length === 0) {
      const altUrls = [
        'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxviii/prova-xxviii.pdf',
        'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxviii/prova-xxviii-primeira-fase.pdf',
        'https://s3-sa-east-1.amazonaws.com/uploads-trilhante-sp/oab/oab-1-fase/provas-antigas/xxviii/caderno_tipo_1_xxviii.pdf',
      ]
      let downloaded = false
      for (const url of altUrls) {
        console.log(`Trying XXVIII URL: ${url}`)
        try {
          await downloadFile(url, provaPath)
          const size = fs.statSync(provaPath).size
          if (size > 10000) { console.log(`  Downloaded ${size} bytes`); downloaded = true; break }
          fs.unlinkSync(provaPath)
        } catch (e) {
          console.log(`  Failed: ${e.message}`)
          if (fs.existsSync(provaPath)) fs.unlinkSync(provaPath)
        }
      }
      if (downloaded) {
        console.log('Parsing XXVIII...')
        const questions = await parseProvaFile(provaPath, 'XXVIII')
        if (questions && questions.length > 0) {
          exam.questions = questions.map(q => ({
            number: q.number, text: q.text || '',
            options: { a: '', b: '', c: '', d: '' }, correctAnswer: '',
          }))
          console.log(`  XXVIII: ${questions.length} questions`)
        }
      }
    }
  }

  // ─── XLII, XLV: create placeholder questions (garbled font encoding) ───────
  for (const numeral of ['XLII', 'XLV']) {
    const exam = data.find(e => e.numeral === numeral)
    if (!exam) continue
    if (exam.questions.length < 10) {
      console.log(`${numeral}: creating placeholder questions (PDF has unreadable font encoding)`)
      exam.questions = Array.from({ length: 80 }, (_, i) => ({
        number: i + 1,
        text: `Questão ${i + 1}`,
        options: { a: '', b: '', c: '', d: '' },
        correctAnswer: '',
      }))
    }
  }

  // ─── Apply all gabaritos ───────────────────────────────────────────────────
  console.log('\nApplying gabaritos...')
  for (const exam of data) {
    const raw = GABARITOS[exam.numeral]
    if (!raw) { console.log(`${exam.numeral}: no gabarito`); continue }
    const answers = raw.split(',')
    let count = 0
    for (const q of exam.questions) {
      const ans = answers[q.number - 1]
      if (!ans) continue
      q.correctAnswer = ans === 'ANULADA' ? '' : ans.toLowerCase()
      count++
    }
    const total = exam.questions.length
    const answered = exam.questions.filter(q => q.correctAnswer !== '' || answers[q.number - 1] === 'ANULADA').length
    console.log(`${exam.numeral}: ${total} questions, ${answered} answered`)
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8')

  console.log('\nFinal summary:')
  for (const e of data) {
    const answered = e.questions.filter(q => q.correctAnswer).length
    const flag = e.questions.length !== 80 ? ' ⚠' : ''
    console.log(`  ${e.numeral.padEnd(8)}: ${e.questions.length} questions, ${answered} answered${flag}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })

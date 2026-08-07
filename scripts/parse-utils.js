'use strict'
const pdf = require('pdf-parse')
const fs  = require('fs')

function collapse(s) { return s.replace(/\s+/g, ' ').trim() }

async function getPdfText(pdfPath) {
  try {
    const buf = fs.readFileSync(pdfPath)
    const r   = await pdf(buf)
    return r.text || ''
  } catch { return '' }
}

// Detect whether the text is garbled (font encoding issue)
function isGarbled(text) {
  const sample = text.substring(0, 500)
  const weird  = (sample.match(/[-ÿĀ-ɏ]/g) || []).length
  return weird > sample.length * 0.3
}

// Remove survey questions (questionário de percepção)
function isSurvey(statement) {
  const s = statement.toLowerCase()
  return (
    s.includes('grau de dificuldade') ||
    s.includes('extensão da prova') ||
    s.includes('capacidade crítica') ||
    s.includes('enunciados das questões estavam') ||
    s.includes('tipo de dificuldade') ||
    s.includes('preparação para esta prova') ||
    s.includes('preparação para o exame') ||
    s.includes('informações / instruções fornecidas') ||
    s.includes('questões das diversas áreas') ||
    s.includes('avaliação quanto à capacidade')
  )
}

// Extract alternatives from a question block (text may have \n)
function extractAlts(block) {
  let alts = {}

  // Pattern (A) text (B) text ... (with optional space inside parens or around)
  const reP = /\(\s*([ABCD])\s*\)\s*([\s\S]*?)(?=\(\s*[ABCD]\s*\)|$)/g
  let m
  while ((m = reP.exec(block)) !== null)
    alts[m[1].toLowerCase()] = collapse(m[2])

  if (alts.a && alts.b && alts.c && alts.d) {
    const cut = block.search(/\(\s*A\s*\)/)
    return { statement: collapse(block.slice(0, cut >= 0 ? cut : block.length)), alternatives: alts }
  }

  // Pattern: mixed (A)/A) at line start — optional opening paren handles hybrid formats
  alts = {}
  const reMix = /(?:^|\n)\s*\(?([ABCD])\s*\)\s*([\s\S]*?)(?=(?:^|\n)\s*\(?[ABCD]\s*\)|$)/g
  while ((m = reMix.exec(block)) !== null)
    alts[m[1].toLowerCase()] = collapse(m[2])

  if (alts.a && alts.b && alts.c && alts.d) {
    const cut = block.search(/(?:^|\n)\s*\(?A\s*\)/m)
    return { statement: collapse(block.slice(0, cut > 0 ? cut : block.length)), alternatives: alts }
  }

  // Pattern A) text B) C) D) at line start or after newline (optional space before paren)
  alts = {}
  const reL = /(?:^|\n)\s*([ABCD])\s*\)\s*([\s\S]*?)(?=(?:^|\n)\s*[ABCD]\s*\)|$)/g
  while ((m = reL.exec(block)) !== null)
    alts[m[1].toLowerCase()] = collapse(m[2])

  if (alts.a && alts.b && alts.c && alts.d) {
    const cut = block.search(/(?:^|\n)\s*A\s*\)\s/m)
    return { statement: collapse(block.slice(0, cut > 0 ? cut : block.length)), alternatives: alts }
  }

  // Pattern collapsed: "... A) text B) text" — preceded by space or period, with optional space before )
  alts = {}
  const reS = /(?:^|[ .])([ABCD])\s*\)\s*(.{5,}?)(?=[ .][ABCD]\s*\)|$)/g
  while ((m = reS.exec(block)) !== null)
    alts[m[1].toLowerCase()] = collapse(m[2])

  if (alts.a && alts.b && alts.c && alts.d) {
    const cutM = block.match(/(?:^|[ .])A\s*\)/)
    const cut  = cutM ? block.indexOf(cutM[0]) + (cutM[0].startsWith('A') ? 0 : 1) : -1
    return { statement: collapse(block.slice(0, cut > 0 ? cut : block.length)), alternatives: alts }
  }

  // Pattern Aword Bword Cword Dword (exam I format — fused letter+text, with newlines)
  // Lookahead requires UPPERCASE after [ABCD] so page-header words like "Caderno" (lowercase a)
  // don't trigger a spurious split and overwrite the real alternative.
  alts = {}
  const reI = /\n([ABCD])([A-ZÁÀÂÃÉÊÍÓÔÕÚa-záàâãéêíóôõúüçñ][\s\S]*?)(?=\n[ABCD][A-ZÁÀÂÃÉÊÍÓÔÕÚ]|$)/g
  const iMatches = []
  while ((m = reI.exec(block)) !== null)
    iMatches.push({ letter: m[1], text: collapse(m[2]) })

  // Detect spurious matches: a word on its own line starting with [ABCD] (e.g. "Disciplina.")
  // gets misread as the next alternative marker. Signs: same letter appears twice, the first
  // occurrence is a single word (no spaces) with ≤20 chars, AND the preceding alt ends with
  // a conjunction/preposition — meaning the word is actually a line continuation.
  const ptConjunctions = /\s+(e|ou|de|da|do|a|o|em|ao|no|na|com|para|que)\s*$/
  for (let i = 1; i < iMatches.length; i++) {
    const prev = iMatches[i - 1]
    const curr = iMatches[i]
    const hasLaterSame = iMatches.slice(i + 1).some(x => x.letter === curr.letter)
    const isSingleWord = curr.text.length <= 20 && !/\s/.test(curr.text.replace(/[.,;!?]\s*$/, ''))
    if (hasLaterSame && isSingleWord && ptConjunctions.test(prev.text)) {
      // Merge: restore the letter marker + continuation text into the previous alt
      prev.text = prev.text.trimEnd() + ' ' + curr.letter + curr.text
      iMatches.splice(i, 1)
      i--
    }
  }

  for (const match of iMatches)
    alts[match.letter.toLowerCase()] = match.text

  if (alts.a && alts.b && alts.c && alts.d) {
    const cut = block.search(/\nA[A-ZÁÀÂÃÉÊÍÓÔÕÚa-záàâãéêíóôõúüçñ]/)
    return { statement: collapse(block.slice(0, cut > 0 ? cut : block.length)), alternatives: alts }
  }

  // Pattern for already-collapsed text: A<text> B<text> or . A<text> . B<text>
  // Exam I text already collapsed into single line with alternatives inline
  alts = {}
  const reC = /(?:^|[. ])([ABCD])([A-ZÁÀÂÃÉÊÍÓÔÕÚa-záàâãéêíóôõúüçñ].{5,}?)(?=[. ][ABCD][A-ZÁÀÂÃÉÊÍÓÔÕÚa-záàâãéêíóôõúüçñ]|$)/g
  while ((m = reC.exec(block)) !== null)
    alts[m[1].toLowerCase()] = collapse(m[2])

  if (alts.a && alts.b && alts.c && alts.d) {
    const cutM = block.match(/(?:^|[. ])A[A-ZÁÀÂÃÉÊÍÓÔÕÚa-záàâãéêíóôõúüçñ]/)
    const cut   = cutM ? block.indexOf(cutM[0]) + (cutM[0].startsWith('A') ? 0 : 1) : -1
    return { statement: collapse(block.slice(0, cut > 0 ? cut : block.length)), alternatives: alts }
  }

  // Fallback
  return { statement: collapse(block), alternatives: { a: '', b: '', c: '', d: '' } }
}

// ── Format parsers ──────────────────────────────────────────────────────────

// QUESTÃO N (all-caps) — Exam I
function parseQuestaoUppercase(text) {
  const qs   = []
  const re   = /QUEST[AÃ]O\s+(\d+)\s*([\s\S]*?)(?=QUEST[AÃ]O\s+\d+|$)/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1])
    if (num < 1 || num > 80) continue
    const block = m[2].trim()
    if (block.length < 30) continue
    const ex = extractAlts(block)
    if (!isSurvey(ex.statement)) qs.push({ number: num, ...ex })
  }
  return qs
}

// Questão N (mixed-case) — Exams III-XXIX
function parseQuestaoMixed(text) {
  const qs = []
  // Some PDFs split "Questão" across lines as "Que\nstão" — rejoin before parsing
  // Also normalise "Questão29" (no space) to "Questão 29"
  const normalized = text
    .replace(/Que\s*\n\s*stão\b/g, 'Questão')
    .replace(/Questão(\d+)/g, 'Questão $1')
  const re = /Questão\s+(\d+)\s*([\s\S]*?)(?=Questão\s+\d+|$)/gi
  let m
  while ((m = re.exec(normalized)) !== null) {
    const num = parseInt(m[1])
    if (num < 1 || num > 80) continue
    const block = m[2].trim()
    if (block.length < 30) continue
    const ex = extractAlts(block)
    if (!isSurvey(ex.statement)) qs.push({ number: num, ...ex })
  }
  return qs
}

// Standalone number on own line — Exams XXX-XLVI
function parseStandaloneNumber(text) {
  // Pre-normalize: single-digit exponents (e.g. "2" from "m²") appear on their own line
  // after a line ending with the unit letter "m". Merge them back to avoid false question starts.
  const rawLines = text.split('\n')
  const lines = []
  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim()
    if (/^[1-9]$/.test(t) && lines.length > 0 && /\bm\s*$/.test(lines[lines.length - 1].trimEnd())) {
      lines[lines.length - 1] += t   // join superscript to the "m" line → "m2"
    } else {
      lines.push(rawLines[i])
    }
  }

  const qs     = []
  let curNum   = null
  let curLines = []

  function flush() {
    if (curNum === null) return
    const block = curLines.join('\n').trim()
    if (block.length >= 30) {
      const ex = extractAlts(block)
      if (!isSurvey(ex.statement)) qs.push({ number: curNum, ...ex })
    }
    curNum   = null
    curLines = []
  }

  for (const line of lines) {
    const m = line.trim().match(/^(\d{1,2})\s*$/)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 1 && n <= 80) { flush(); curNum = n; continue }
    }
    if (curNum !== null) curLines.push(line)
  }
  flush()
  return qs
}

// Exam II — 2-digit number + code + (A) format, with watermarks between header lines
function parseExamII(text) {
  // Strip known noise: URLs, "Caderno de Prova", exam header lines, page markers
  const clean = text
    .replace(/www\.[^\n]+/gi, '')
    .replace(/https?:\/\/[^\n]+/gi, '')
    .replace(/Caderno de Prova[^\n]*/gi, '')
    .replace(/OAB\s*[–-]\s*Exame de Ordem[^\n]*/gi, '')
    // Normalize "07          A00425" (number + code on same line) → just "07"
    .replace(/^(\s*)(0[1-9]|[1-7]\d|80)\s+[A-Z]\d{5}\s*$/mg, '$1$2')
    .replace(/\n\s*[A-Z]\d{5}\s*\n/g, '\n')  // remove code lines like A00413
    // Join date fragments like "03\n/01/2008" so "03" isn't mistaken for question 3
    .replace(/\n(0[1-9]|[1-2]\d|3[0-1])\n(\/\d{2}\/\d{4})/g, '\n$1$2')

  const qs = []
  // Questions start with 2-digit number at line start
  const re = /\n\s*(0[1-9]|[1-7]\d|80)\s*\n([\s\S]*?)(?=\n\s*(?:0[1-9]|[1-7]\d|80)\s*\n|$)/g
  let m
  while ((m = re.exec(clean)) !== null) {
    const numM = m[1]
    const num  = parseInt(numM)
    if (num < 1 || num > 80) continue

    // Remove the repeated question number at start of content block
    let block = m[2].replace(/^\s*0?\d{1,2}\s*\n/, '').trim()
    // Remove any remaining noise (short lines that are just numbers or codes)
    block = block.split('\n').filter(l => {
      const t = l.trim()
      return t.length > 0 && !/^\d{1,2}$/.test(t) && !/^[A-Z]\d{5}$/.test(t)
    }).join('\n').trim()

    if (block.length < 30) continue
    const ex = extractAlts(block)
    if (!isSurvey(ex.statement)) qs.push({ number: num, ...ex })
  }
  return qs
}

// Strip page footers / garbled suffixes that leak into alternative text
function cleanAlt(s) {
  if (!s) return s
  let t = s
  // "XXXI EXAME DE ORDEM UNIFICADO – TIPO 1 – BRANCA PROVA APLICADA EM..." (roman numeral prefix)
  t = t.replace(/\s+(?:\d+\s+)?[IVXLCDM]+\s+EXAME\s+D[EO]\s+ORDEM\s+UNIFICADO[\s\S]*/i, '')
  // "40º EXAME DE ORDEM UNIFICADO..." (ordinal-number prefix, e.g. Exam XL)
  t = t.replace(/\s+\d+[º°o]?\s+EXAME\s+D[EO]\s+ORDEM\s+UNIFICADO[\s\S]*/i, '')
  // "EXAME DE ORDEM UNIFICADO 2010.3 – TIPO 1 – BRANCO Página 4" (Exam III — no prefix)
  t = t.replace(/\s+EXAME\s+DE\s+ORDEM\s+UNIFICADO\s+\d{4}\.\d[\s\S]*/i, '')
  // "TIPO BRANCA–PÁGINA 4" or "Tipo Branca – Página 4" (Exams XL, XLIII)
  t = t.replace(/\s+TIPO\s+BRANCA\s*[-–]\s*P[ÁA]GINA[\s\S]*/i, '')
  // Partial roman-numeral footer at end: "XV EX" (lookahead cut before "AME DE ORDEM...")
  t = t.replace(/\s+(?:\d+\s+)?[IVXLCDM]{2,}\s+EX\w*\s*$/, '')
  // "OAB – Exame de Ordem 2010.1Caderno AFONSO ARINOS – N –" (Exam I)
  t = t.replace(/\s+OAB\s*[-–]\s*Exame\s+de\s+Ordem[\s\S]*/i, '')
  // "fi cado 2010.2" — garbled "ficado" footer in Exam II
  t = t.replace(/\s+fi\s+cado\s+\d[\s\S]*/i, '')
  // Date footer after terminal punctuation: "...sentença. 14 de novembro de 2010"
  t = t.replace(/([.;,!?])\s+\d{1,2}\s+de\s+[a-zA-ZÀ-ú]+\s+de\s+\d{4}[\s\S]*/i, '$1')
  // Trailing leaked alternative letter after sentence terminator: "judicial. D" → "judicial."
  t = t.replace(/([.!?;])\s+[ABCD]\s*$/, '$1')
  // Stray garbled char immediately after period: "empregador.i" → "empregador."
  t = t.replace(/(\.)([a-z])\s*$/, '$1')
  return t.trim()
}

// Best strategy: try all and pick the closest to 80
function parseBest(text, numeral) {
  if (isGarbled(text)) return []

  // Strip the survey section (QUESTIONÁRIO DE PERCEPÇÃO) that bleeds into the last question's block.
  // Search only in the last 30% to avoid false-positives in the exam's intro text,
  // which also mentions "questionário de percepção" in lowercase.
  const tailStart = Math.floor(text.length * 0.7)
  const tailIdx = text.slice(tailStart).search(/QUESTION[ÁA]RIO\s+DE\s+PERCEP/)
  const surveyCut = tailIdx >= 0 ? tailStart + tailIdx : -1
  const textNoSurvey = surveyCut >= 0 ? text.slice(0, surveyCut) : text

  // Pre-clean watermark/header noise common in Exam II format
  const isWatermarked = /www\.[a-z]+\.[a-z]/.test(textNoSurvey)
  const cleanText = isWatermarked
    ? textNoSurvey
        .replace(/www\.[^\n]+/gi, '')
        .replace(/https?:\/\/[^\n]+/gi, '')
        .replace(/Caderno de Prova[^\n]*/gi, '')
        .replace(/OAB\s*[–-]\s*Exame de Ordem[^\n]*/gi, '')
        .replace(/\n[A-Z]\d{5}\s*\n/g, '\n')       // remove code lines like A00413
        .replace(/^\s*[A-Z]\d{5}\s*$/mg, '')        // same for any position
    : textNoSurvey

  const strategies = [
    { name: 'questaoUpper',  fn: () => parseQuestaoUppercase(cleanText) },
    { name: 'questaoMixed',  fn: () => parseQuestaoMixed(cleanText) },
    { name: 'standalone',    fn: () => parseStandaloneNumber(cleanText) },
    { name: 'examII',        fn: () => parseExamII(textNoSurvey) },  // has its own cleaning
  ]

  let best = [], bestScore = -1, bestName = ''
  for (const s of strategies) {
    try {
      const r    = s.fn()
      const uniq = [...new Set(r.map(q => q.number))].length
      // Bonus for strategies that return questions with actual alternatives
      const withAlts = r.filter(q => Object.values(q.alternatives).some(v => v.length > 5)).length
      const score = uniq * 10 + withAlts
      if (score > bestScore) { bestScore = score; best = r; bestName = s.name }
    } catch {}
  }

  // Deduplicate: prefer questions with alternatives
  const seen = new Map()
  for (const q of best) {
    if (!seen.has(q.number)) {
      seen.set(q.number, q)
    } else {
      const prev = seen.get(q.number)
      const prevHasAlts = Object.values(prev.alternatives).some(v => v.length > 5)
      const curHasAlts  = Object.values(q.alternatives).some(v => v.length > 5)
      if (curHasAlts && !prevHasAlts) seen.set(q.number, q)
    }
  }
  const deduped = [...seen.values()].sort((a, b) => a.number - b.number)

  // Clean alternatives: strip page footers and garbled suffixes
  for (const q of deduped) {
    for (const k of Object.keys(q.alternatives)) {
      q.alternatives[k] = cleanAlt(q.alternatives[k] || '')
    }
  }

  return deduped
}

module.exports = { getPdfText, isGarbled, isSurvey, extractAlts, parseBest, cleanAlt }
